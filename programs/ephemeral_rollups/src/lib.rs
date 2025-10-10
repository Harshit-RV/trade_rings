use anchor_lang::prelude::*;

declare_id!("BaFPZGCJ2kKRyEgJPUcW7kBWTmRLgYtpUYYVrFHvBJDF");

#[program]
pub mod ephemeral_rollups {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
