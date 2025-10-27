#![allow(unexpected_cfgs)]
#![allow(deprecated)]
use anchor_lang::prelude::*;
pub mod errors;
use pyth_solana_receiver_sdk::price_update::{PriceUpdateV2};

use ephemeral_rollups_sdk::anchor::{commit, delegate, ephemeral};
use ephemeral_rollups_sdk::cpi::DelegateConfig;
use ephemeral_rollups_sdk::ephem::{commit_accounts, commit_and_undelegate_accounts};

declare_id!("BoKzb5RyCGLM5VuEThDesURM5hi3TRfVF84kYoiokrop");

const ORIGINAL_OWNER: &str = "5azNmbuv4jJbuGPZUEjZq98rxn2PBjaYUnsTfE5ov43R";

pub const ADMIN_CONFIG_ACCOUNT_SEED: &[u8] = b"admin_config_account";
pub const ARENA_ACCOUNT_SEED: &[u8] = b"arena_account";
pub const TRADING_ACCOUNT_SEED: &[u8] = b"trading_account_for_arena";
pub const OPEN_POSITION_ACCOUNT_SEED: &[u8] = b"open_position_account";

pub const ER_VALIDATOR_ACCOUNT_ASIA: &str = "MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57";

// Fixed-point scale factor: 10^6
// This means 1 BTC is stored as 1,000,000 units
const QUANTITY_SCALE_FACTOR: u64 = 1_000_000;

fn get_total_cost(price: i64, exponent: i32, quantity_scaled: i64) -> i128 {
    let current_price_f64 = (price as f64) * 10f64.powi(exponent + 6); // +6 because we're storing balance in micro-USDC
    let current_price = current_price_f64.round().clamp(i64::MIN as f64, i64::MAX as f64) as i64;

    (current_price as i128 * quantity_scaled as i128) / QUANTITY_SCALE_FACTOR as i128
}

#[ephemeral]
#[program]
pub mod ephemeral_rollups {
    use crate::errors::EphemeralRollupError;
    use super::*;
    // admin functions
    pub fn initialize_admin_config_account(ctx: Context<InitAdminConfigAccount>) -> Result<()> {
        #[cfg(not(feature = "test-admin"))]
        require_keys_eq!(ctx.accounts.signer.key(), ORIGINAL_OWNER.parse::<Pubkey>().unwrap(), EphemeralRollupError::Unauthorised);

        let admin_config = &mut ctx.accounts.admin_config_account;

        admin_config.bump = ctx.bumps.admin_config_account;
        admin_config.admin_pubkey = *ctx.accounts.signer.key;
        admin_config.next_arena_pda_seed = 0;

        Ok(())
    }

    pub fn create_arena(ctx: Context<CreateArena>) -> Result<()> {
        let admin_config = &mut ctx.accounts.admin_config_account;
        let arena_account = &mut ctx.accounts.arena_account;

        require_keys_eq!(ctx.accounts.signer.key(), admin_config.admin_pubkey, EphemeralRollupError::Unauthorised);

        arena_account.bump = ctx.bumps.arena_account;
        arena_account.creator = *ctx.accounts.signer.key;
        
        admin_config.next_arena_pda_seed += 1;
        Ok(())
    }

    // public functions
    pub fn create_trading_account_for_arena(ctx: Context<CreateTradingAccountForArena>) -> Result<()> {
        let trading_account = &mut ctx.accounts.trading_account_for_arena;

        trading_account.bump = ctx.bumps.trading_account_for_arena;
        trading_account.authority = *ctx.accounts.signer.key;
        trading_account.open_positions_count = 0;

        // TODO: figure out what the starting balance should be
        trading_account.micro_usdc_balance = 1_000_000_000_000; // 1 million USDC

        Ok(())
    }
    
    pub fn open_position(ctx: Context<OpenPosition>, asset: String, quantity_scaled: i64) -> Result<()> {
        require!(asset.len() <= 10, EphemeralRollupError::AssetNameTooLong);
        require!(quantity_scaled > 0, EphemeralRollupError::ShortingUnsupported);
    
        let trading_account = &mut ctx.accounts.trading_account_for_arena;
        let open_pos = &mut ctx.accounts.open_position_account;
        let latest_price_data = ctx.accounts.price_update.price_message;

        open_pos.bump = ctx.bumps.open_position_account;
        open_pos.asset = asset;
        open_pos.quantity_raw = quantity_scaled as u64;
        trading_account.open_positions_count += 1;

        let total_cost = get_total_cost(latest_price_data.price, latest_price_data.exponent, quantity_scaled);
        
        require!(total_cost <= trading_account.micro_usdc_balance as i128, EphemeralRollupError::InsufficientFunds);
        
        trading_account.micro_usdc_balance -= total_cost as u64;

        Ok(())
    }

    // this function expects the correct open_position_account already passed. 
    // Frontend must go through all open position accounts and find the one that belongs to the asset they want to update.
    pub fn update_position(ctx: Context<UpdateOpenPosition>, quantity_scaled: i64) -> Result<()> {
        let open_pos = &mut ctx.accounts.open_position_account;
        let trading_account = &mut ctx.accounts.trading_account_for_arena;
        let latest_price_data = ctx.accounts.price_update.price_message;

        let total_cost = get_total_cost(latest_price_data.price, latest_price_data.exponent, quantity_scaled);

        require!(total_cost <= trading_account.micro_usdc_balance as i128, EphemeralRollupError::InsufficientFunds);
        require!(open_pos.quantity_raw as i64 + quantity_scaled >= 0, EphemeralRollupError::ShortingUnsupported);

        if quantity_scaled < 0 {
            open_pos.quantity_raw -= -quantity_scaled as u64;
        } else {
            open_pos.quantity_raw += quantity_scaled as u64;
        }
        
        if total_cost < 0 {
            trading_account.micro_usdc_balance += (-total_cost) as u64;
        } else {
            trading_account.micro_usdc_balance -= total_cost as u64;
        }

        Ok(())
    }

    pub fn close_position(ctx: Context<ClosePosition>) -> Result<()> {
        let open_pos = &ctx.accounts.open_position_account;
        let trading_account = &mut ctx.accounts.trading_account_for_arena;
        let latest_price_data = ctx.accounts.price_update.price_message;

        let total_cost = get_total_cost(latest_price_data.price, latest_price_data.exponent, open_pos.quantity_raw as i64);

        require_keys_eq!(ctx.accounts.signer.key(), trading_account.authority.key(), EphemeralRollupError::Unauthorised);
        
        trading_account.micro_usdc_balance += total_cost as u64;

        // NOT DOING THIS: refer to TODO/DISCLAIMER on [TradingAccountForArena]
        // trading_account.open_positions_count -= 1;
        Ok(())
    }

    // TODO: for loop that gets all open_position_accounts and closes them
    pub fn close_all_positions(_ctx: Context<OpenPosition>) -> Result<()> {
        Ok(())
    }

    pub fn delegate_trading_account(ctx: Context<DelegateTradingAccount>) -> Result<()> {
        let arena_account = &ctx.accounts.arena_account;
        let signer = &ctx.accounts.signer;
        let trading_account = &ctx.accounts.trading_account_for_arena;

        ctx.accounts.delegate_trading_account_for_arena(
            signer,
            &[TRADING_ACCOUNT_SEED, signer.key().as_ref(), arena_account.key().as_ref()],
            DelegateConfig {
                // TODO: figure out the value of this, and what it does
                commit_frequency_ms: 30_000,
                validator: Some(
                    ER_VALIDATOR_ACCOUNT_ASIA.parse::<Pubkey>().unwrap(),
                ),
                ..Default::default()
            },
        )?;

        msg!("Trading account {} delegated to Ephemeral Rollup validator", trading_account.key());
        Ok(())
    }
    
    pub fn delegate_open_position_account(ctx: Context<DelegateOpenPositionAccount>, trading_account: Pubkey, pda_position_seed: u8) -> Result<()> {
        let signer = &ctx.accounts.signer;
        let position_account =  &ctx.accounts.open_position_account;

        ctx.accounts.delegate_open_position_account(
            signer,
            &[OPEN_POSITION_ACCOUNT_SEED, signer.key().as_ref(), trading_account.key().as_ref(), &pda_position_seed.to_le_bytes()],
            DelegateConfig {
                // TODO: figure out the value of this, and what it does
                commit_frequency_ms: 30_000,
                validator: Some(
                    ER_VALIDATOR_ACCOUNT_ASIA.parse::<Pubkey>().unwrap(),
                ),
                ..Default::default()
            },
        )?;

        msg!("Open position account {} delegated to Ephemeral Rollup validator", position_account.key());
        Ok(())
    }

    // TODO: check how we can use this to commit multiple accounts at once, as it's taking a vector of accounts as input
    pub fn commit_account(ctx: Context<CommitOrUndelegateAccount>) -> Result<()> {
        let account = &ctx.accounts.account;
        
        commit_accounts(
            &ctx.accounts.signer,
            vec![&account.to_account_info()],
            &ctx.accounts.magic_context,
            &ctx.accounts.magic_program,
        )?;

        msg!("State of account {} committed to base layer", account.key);
        Ok(())
    }

    pub fn undelegate(ctx: Context<CommitOrUndelegateAccount>) -> Result<()> {
        let account = &ctx.accounts.account;

        commit_and_undelegate_accounts(
            &ctx.accounts.signer,
            vec![&account.to_account_info()],
            &ctx.accounts.magic_context,
            &ctx.accounts.magic_program,
        )?;

        msg!("Account {} undelegated", account.key);
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct AdminConfig {
    admin_pubkey: Pubkey,
    bump: u8,
    next_arena_pda_seed: u16
}

#[derive(Accounts)]
pub struct InitAdminConfigAccount<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + AdminConfig::INIT_SPACE,
        seeds = [ ADMIN_CONFIG_ACCOUNT_SEED ],
        bump
    )]
    pub admin_config_account: Account<'info, AdminConfig>,

    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct ArenaAccount {
    creator: Pubkey,
    bump: u8,
}

#[derive(Accounts)]
pub struct CreateArena<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + ArenaAccount::INIT_SPACE,
        seeds = [ARENA_ACCOUNT_SEED, &admin_config_account.next_arena_pda_seed.to_le_bytes()],
        bump
    )]
    pub arena_account: Account<'info, ArenaAccount>,

    #[account(
        mut,
        seeds = [ ADMIN_CONFIG_ACCOUNT_SEED ],
        bump = admin_config_account.bump
    )]
    pub admin_config_account: Account<'info, AdminConfig>,


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
    // 1 USDC = 1_000_000 micro-USDC
    micro_usdc_balance: u64,
    bump: u8,
}

#[derive(Accounts)]
pub struct CreateTradingAccountForArena<'info> {
    #[account(
        init,
        payer = signer,
        space = 8 + TradingAccountForArena::INIT_SPACE,
        seeds = [TRADING_ACCOUNT_SEED, signer.key().as_ref(), arena_account.key().as_ref()],
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
    quantity_raw: u64, // Fixed-point representation: quantity * 10^6
    bump: u8
}

#[derive(Accounts)]
pub struct OpenPosition<'info> {
    #[account(
        init, 
        payer = signer,
        space = 8 + OpenPositionAccount::INIT_SPACE,
        seeds = [OPEN_POSITION_ACCOUNT_SEED, signer.key().as_ref(), trading_account_for_arena.key().as_ref(), &trading_account_for_arena.open_positions_count.to_le_bytes()],
        bump
    )]
    pub open_position_account: Account<'info, OpenPositionAccount>,

    pub price_update: Account<'info, PriceUpdateV2>,

    #[account(
        mut,
        seeds = [TRADING_ACCOUNT_SEED, signer.key().as_ref(), arena_account.key().as_ref()],
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
        seeds = [TRADING_ACCOUNT_SEED, signer.key().as_ref(), arena_account.key().as_ref()],
        bump = trading_account_for_arena.bump
    )]
    pub trading_account_for_arena: Account<'info, TradingAccountForArena>,

    pub price_update: Account<'info, PriceUpdateV2>,

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
        seeds = [TRADING_ACCOUNT_SEED, signer.key().as_ref(), arena_account.key().as_ref()],
        bump = trading_account_for_arena.bump
    )]
    pub trading_account_for_arena: Account<'info, TradingAccountForArena>,

    pub price_update: Account<'info, PriceUpdateV2>,

    pub arena_account: Account<'info, ArenaAccount>,

    #[account(mut)]
    pub signer: Signer<'info>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegateTradingAccount<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        del,
        seeds = [TRADING_ACCOUNT_SEED, signer.key().as_ref(), arena_account.key().as_ref()],
        bump = trading_account_for_arena.bump
    )]
    pub trading_account_for_arena: Account<'info, TradingAccountForArena>,

    pub arena_account: Account<'info, ArenaAccount>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegateOpenPositionAccount<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(mut, del)]
    pub open_position_account: Account<'info, OpenPositionAccount>,
}


#[commit]
#[derive(Accounts)]
pub struct CommitOrUndelegateAccount<'info> {
    /// CHECK:` This is a generic context which can be used to committing/undelegating any account of any type.
    #[account(mut)]
    pub account: AccountInfo<'info>,

    #[account(mut)]
    pub signer: Signer<'info>,
}