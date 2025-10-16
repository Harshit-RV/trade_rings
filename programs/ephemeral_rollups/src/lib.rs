use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::{PriceUpdateV2};

declare_id!("BoKzb5RyCGLM5VuEThDesURM5hi3TRfVF84kYoiokrop");

#[program]
pub mod ephemeral_rollups {
    use super::*;
    // admin_fn -> admin functions

    // only needed to create arenas
    pub fn admin_fn_create_profile(ctx: Context<CreateUserProfile>, name: String) -> Result<()> {
        require!(name.len() <= 10, EphemeralRollupError::NameTooLong);

        let profile_account = &mut ctx.accounts.profile_account;

        profile_account.bump = ctx.bumps.profile_account;
        profile_account.pubkey = *ctx.accounts.signer.key;
        profile_account.name = name;

        Ok(())
    }

    pub fn admin_fn_create_arena(ctx: Context<CreateArena>) -> Result<()> {
        // TODO: add checks, not everyone should be able to create an arena

        let arena_account = &mut ctx.accounts.arena_account;

        arena_account.bump = ctx.bumps.arena_account;
        arena_account.creator = *ctx.accounts.signer.key;
        ctx.accounts.signer_profile_account.arenas_created_count += 1;

        Ok(())
    }

    pub fn create_trading_account_for_arena(ctx: Context<CreateTradingAccountForArena>) -> Result<()> {
        let trading_account = &mut ctx.accounts.trading_account_for_arena;

        trading_account.bump = ctx.bumps.trading_account_for_arena;
        trading_account.authority = *ctx.accounts.signer.key;
        trading_account.open_positions_count = 0;

        // TODO: figure out what the starting balance should be
        trading_account.usdc_balance = 1_000_000;

        Ok(())
    }
    
    pub fn open_position(ctx: Context<OpenPosition>, asset: String, quantity: i32) -> Result<()> {
        require!(asset.len() <= 10, EphemeralRollupError::AssetNameTooLong);

        let trading_account = &mut ctx.accounts.trading_account_for_arena;
        let open_pos =  &mut ctx.accounts.open_position_account;

        let latest_price = ctx.accounts.price_update.price_message;

        // TODO: figure out proper types for all vars
        let current_price_f64 = (latest_price.price as f64) * 10f64.powi(latest_price.exponent);

        let current_price = current_price_f64.round()
            .clamp(i32::MIN as f64, i32::MAX as f64) // avoid overflow
            as i32;

        msg!("Price from Pyth: price: {}, confidence: {}, exponent: {}, publish time: {}", latest_price.price, latest_price.conf, latest_price.exponent, latest_price.publish_time );
        
        open_pos.bump = ctx.bumps.open_position_account;
        trading_account.open_positions_count += 1;
        
        require!(quantity * current_price <= trading_account.usdc_balance, EphemeralRollupError::InsufficientFunds);
        require!(quantity >= 0, EphemeralRollupError::ShortingUnsupported);

        trading_account.usdc_balance -= quantity * current_price;
        open_pos.asset = asset;
        open_pos.quantity = quantity;
        
        Ok(())
    }

    // this function expects the correct open_position_account already passed. 
    // Frontend must go through all open position accounts and find the one that belongs to the asset they want to update.
    pub fn update_position(ctx: Context<UpdateOpenPosition>, quantity: i32) -> Result<()> {
        let open_pos = &mut ctx.accounts.open_position_account;
        let trading_account = &mut ctx.accounts.trading_account_for_arena;
        
        let price = 100; // TODO: get current price of asset using Oracle price feeds.

        require!(quantity * price <= trading_account.usdc_balance, EphemeralRollupError::InsufficientFunds);
        require!(open_pos.quantity + quantity >= 0, EphemeralRollupError::ShortingUnsupported);
        
        open_pos.quantity += quantity;
        trading_account.usdc_balance -= quantity * price;

        Ok(())
    }

    pub fn close_position(ctx: Context<ClosePosition>) -> Result<()> {
        let open_pos = &ctx.accounts.open_position_account;
        let trading_account = &mut ctx.accounts.trading_account_for_arena;

        require_keys_eq!(ctx.accounts.signer.key(), trading_account.authority.key(), EphemeralRollupError::Unauthorised);

        let price = 100; // TODO: get current price of asset using Oracle price feeds.
    
        trading_account.usdc_balance += open_pos.quantity * price;

        // NOT DOING THIS: refer to TODO/DISCLAIMER on [TradingAccountForArena]
        // trading_account.open_positions_count -= 1;
        Ok(())
    }

    // TODO: for loop that gets all open_position_accounts and closes them
    pub fn close_all_positions(ctx: Context<OpenPosition>) -> Result<()> {
        Ok(())
    }
}


#[account]
#[derive(InitSpace)]
pub struct UserProfile {
    pubkey: Pubkey,
    arenas_created_count: u8,
    bump: u8,
    #[max_len(10)]
    name: String,
}
#[derive(Accounts)]
pub struct CreateUserProfile<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + UserProfile::INIT_SPACE,
        seeds = [b"user_profile_account", signer.key().as_ref()],
        bump
    )]
    pub profile_account: Account<'info, UserProfile>,

    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}


#[account]
#[derive(InitSpace)]
pub struct ArenaAccount {
    // TODO: should we add a field that stores the public key of this PDA inside the data?
    creator: Pubkey,
    bump: u8,
}

#[derive(Accounts)]
pub struct CreateArena<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + ArenaAccount::INIT_SPACE,
        seeds = [b"arena_account", signer.key().as_ref(), &signer_profile_account.arenas_created_count.to_le_bytes()],
        bump
    )]
    pub arena_account: Account<'info, ArenaAccount>,

    #[account(
        mut, 
        seeds = [b"user_profile_account", signer.key().as_ref()],
        bump = signer_profile_account.bump
    )]
    pub signer_profile_account: Account<'info, UserProfile>,

    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}


#[account]
#[derive(InitSpace)]
pub struct TradingAccountForArena {
    authority: Pubkey,
    // TODO: figure out the correct datatype for this count. User/agent may trade more than 255 times.
    // TODO/DISCLAIMER: this won't help protect us forever. In case of closing accounts, we might close an account that sits in the middle of the list
    // find a more scalable way to predictably get accounts.
    // temp fix: don't subtract from open_positions_count on account close and go until this count on frontend and show data of accounts that are not empty
    open_positions_count: u8,
    usdc_balance: i32,
    bump: u8,
}

#[derive(Accounts)]
pub struct CreateTradingAccountForArena<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + TradingAccountForArena::INIT_SPACE,
        seeds = [b"trading_account_for_arena", signer.key().as_ref(), arena_account.key().as_ref()],
        bump
    )]
    pub trading_account_for_arena: Account<'info, TradingAccountForArena>,

    pub arena_account: Account<'info, ArenaAccount>,

    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>
}



#[account]
#[derive(InitSpace)]
pub struct OpenPositionAccount {
    // TODO: figure out what length we should put here
    #[max_len(10)]
    asset: String,
    quantity: i32,
    bump: u8
}

#[derive(Accounts)]
pub struct OpenPosition<'info> {
    #[account(
        init, 
        payer = signer,
        space = 8 + OpenPositionAccount::INIT_SPACE,
        seeds = [b"open_position_account", signer.key().as_ref(), trading_account_for_arena.key().as_ref(), &trading_account_for_arena.open_positions_count.to_le_bytes()],
        bump
    )]
    pub open_position_account: Account<'info, OpenPositionAccount>,

    pub price_update: Account<'info, PriceUpdateV2>,

    #[account(
        mut,
        seeds = [b"trading_account_for_arena", signer.key().as_ref(), arena_account.key().as_ref()],
        bump = trading_account_for_arena.bump
    )]
    pub trading_account_for_arena: Account<'info, TradingAccountForArena>,

    pub arena_account: Account<'info, ArenaAccount>,

    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateOpenPosition<'info> {
    #[account(mut)]
    pub open_position_account: Account<'info, OpenPositionAccount>,

    #[account(
        mut,
        seeds = [b"trading_account_for_arena", signer.key().as_ref(), arena_account.key().as_ref()],
        bump = trading_account_for_arena.bump
    )]
    pub trading_account_for_arena: Account<'info, TradingAccountForArena>,

    pub arena_account: Account<'info, ArenaAccount>,

    #[account(mut)]
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClosePosition<'info> {
    #[account(mut, close = signer)]
    pub open_position_account: Account<'info, OpenPositionAccount>,

    #[account(
        mut,
        seeds = [b"trading_account_for_arena", signer.key().as_ref(), arena_account.key().as_ref()],
        bump = trading_account_for_arena.bump
    )]
    pub trading_account_for_arena: Account<'info, TradingAccountForArena>,

    pub arena_account: Account<'info, ArenaAccount>,

    #[account(mut)]
    pub signer: Signer<'info>,
}


#[error_code]
pub enum EphemeralRollupError {
    #[msg("You are not authorised to perform this function")]
    Unauthorised,
    #[msg("You must create a profile first by calling create_profile method")]
    UnknownUser,
    #[msg("Name must be 10 characters or smaller")]
    NameTooLong,
    #[msg("Asset name must be 10 characters or smaller")]
    AssetNameTooLong,
    #[msg("Your account does not have enough funds to execute this transactions.")]
    InsufficientFunds,
    #[msg("Shorting an asset is not supported as of now.")]
    ShortingUnsupported,
}
