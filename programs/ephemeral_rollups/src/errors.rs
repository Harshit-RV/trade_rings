use anchor_lang::prelude::*;

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
