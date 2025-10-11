use anchor_lang::prelude::*;

declare_id!("BoKzb5RyCGLM5VuEThDesURM5hi3TRfVF84kYoiokrop");

#[program]
pub mod ephemeral_rollups {
    use super::*;

    // only needed to create arenas
    pub fn create_profile(ctx: Context<CreateUserProfile>, name: String) -> Result<()> {
        require!(name.len() <= 10, EphemeralRollupError::NameTooLong);

        let profile_account = &mut ctx.accounts.profile_account;

        profile_account.bump = ctx.bumps.profile_account;
        profile_account.pubkey = *ctx.accounts.signer.key;
        profile_account.name = name;

        Ok(())
    }

    pub fn create_arena(ctx: Context<CreateArena>) -> Result<()> {
        // TODO: add checks, not everyone should be able to create an arena

        let arena_account = &mut ctx.accounts.arena_account;

        arena_account.bump = ctx.bumps.arena_account;
        arena_account.creator = *ctx.accounts.signer.key;
        ctx.accounts.signer_profile_account.arenas_created_count += 1;

        Ok(())
    }

    pub fn create_trading_account_for_arena(ctx: Context<CreateTradingAccountForArena>) -> Result<()> {
        let trading_account_for_arena = &mut ctx.accounts.trading_account_for_arena;

        trading_account_for_arena.bump = ctx.bumps.trading_account_for_arena;
        trading_account_for_arena.pubkey = *ctx.accounts.signer.key;

        Ok(())
    }
    
    pub fn trade_in_arena(ctx: Context<TradeInArena>) -> Result<()> {
        let trading_account_for_arena = &mut ctx.accounts.trading_account_for_arena;
        let trade_account =  &mut ctx.accounts.trade_account;

        trade_account.bump = ctx.bumps.trade_account;
        trade_account.pubkey = *ctx.accounts.signer.key;
        trading_account_for_arena.trade_count += 1;
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
    pubkey: Pubkey,
    // TODO: figure out the correct datatype for this count. User/agent may trade more than 255 times.
    trade_count: u8,
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
pub struct TradeAccount {
    // TODO: figure out how to store transactions data in this account
    pubkey: Pubkey,
    bump: u8,
}

#[derive(Accounts)]
pub struct TradeInArena<'info> {
    #[account(
        init, 
        payer = signer,
        space = 8 + TradeAccount::INIT_SPACE,
        seeds = [b"trade_account", signer.key().as_ref(), trading_account_for_arena.key().as_ref(), &trading_account_for_arena.trade_count.to_le_bytes()],
        bump
    )]
    pub trade_account: Account<'info, TradeAccount>,

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


#[error_code]
pub enum EphemeralRollupError {
    #[msg("You are not authorised to perform this function")]
    Unauthorised,
    #[msg("You must create a profile first by calling create_profile method")]
    UnknownUser,
    #[msg("Name must be 10 characters or smaller")]
    NameTooLong,
}
