/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/ephemeral_rollups.json`.
 */
export type EphemeralRollups = {
  "address": "BoKzb5RyCGLM5VuEThDesURM5hi3TRfVF84kYoiokrop",
  "metadata": {
    "name": "ephemeralRollups",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "adminFnCreateArena",
      "discriminator": [
        186,
        53,
        47,
        32,
        27,
        232,
        72,
        25
      ],
      "accounts": [
        {
          "name": "arenaAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  114,
                  101,
                  110,
                  97,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "account",
                "path": "signer_profile_account.arenas_created_count",
                "account": "userProfile"
              }
            ]
          }
        },
        {
          "name": "signerProfileAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "adminFnCreateProfile",
      "discriminator": [
        205,
        137,
        116,
        10,
        204,
        83,
        183,
        209
      ],
      "accounts": [
        {
          "name": "profileAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              }
            ]
          }
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "closeAllPositions",
      "discriminator": [
        199,
        114,
        100,
        82,
        76,
        226,
        236,
        47
      ],
      "accounts": [
        {
          "name": "openPositionAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  112,
                  101,
                  110,
                  95,
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "account",
                "path": "tradingAccountForArena"
              },
              {
                "kind": "account",
                "path": "trading_account_for_arena.open_positions_count",
                "account": "tradingAccountForArena"
              }
            ]
          }
        },
        {
          "name": "tradingAccountForArena",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  100,
                  105,
                  110,
                  103,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  95,
                  102,
                  111,
                  114,
                  95,
                  97,
                  114,
                  101,
                  110,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "account",
                "path": "arenaAccount"
              }
            ]
          }
        },
        {
          "name": "arenaAccount"
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "closePosition",
      "discriminator": [
        123,
        134,
        81,
        0,
        49,
        68,
        98,
        98
      ],
      "accounts": [
        {
          "name": "openPositionAccount",
          "writable": true
        },
        {
          "name": "tradingAccountForArena",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  100,
                  105,
                  110,
                  103,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  95,
                  102,
                  111,
                  114,
                  95,
                  97,
                  114,
                  101,
                  110,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "account",
                "path": "arenaAccount"
              }
            ]
          }
        },
        {
          "name": "arenaAccount"
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "createTradingAccountForArena",
      "discriminator": [
        163,
        20,
        26,
        207,
        77,
        226,
        167,
        90
      ],
      "accounts": [
        {
          "name": "tradingAccountForArena",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  100,
                  105,
                  110,
                  103,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  95,
                  102,
                  111,
                  114,
                  95,
                  97,
                  114,
                  101,
                  110,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "account",
                "path": "arenaAccount"
              }
            ]
          }
        },
        {
          "name": "arenaAccount"
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "openPosition",
      "discriminator": [
        135,
        128,
        47,
        77,
        15,
        152,
        240,
        49
      ],
      "accounts": [
        {
          "name": "openPositionAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  112,
                  101,
                  110,
                  95,
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "account",
                "path": "tradingAccountForArena"
              },
              {
                "kind": "account",
                "path": "trading_account_for_arena.open_positions_count",
                "account": "tradingAccountForArena"
              }
            ]
          }
        },
        {
          "name": "tradingAccountForArena",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  100,
                  105,
                  110,
                  103,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  95,
                  102,
                  111,
                  114,
                  95,
                  97,
                  114,
                  101,
                  110,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "account",
                "path": "arenaAccount"
              }
            ]
          }
        },
        {
          "name": "arenaAccount"
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "asset",
          "type": "string"
        },
        {
          "name": "quantity",
          "type": "i32"
        }
      ]
    },
    {
      "name": "updatePosition",
      "discriminator": [
        102,
        75,
        42,
        126,
        57,
        196,
        156,
        9
      ],
      "accounts": [
        {
          "name": "openPositionAccount",
          "writable": true
        },
        {
          "name": "tradingAccountForArena",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  97,
                  100,
                  105,
                  110,
                  103,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116,
                  95,
                  102,
                  111,
                  114,
                  95,
                  97,
                  114,
                  101,
                  110,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "signer"
              },
              {
                "kind": "account",
                "path": "arenaAccount"
              }
            ]
          }
        },
        {
          "name": "arenaAccount"
        },
        {
          "name": "signer",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "quantity",
          "type": "i32"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "arenaAccount",
      "discriminator": [
        83,
        227,
        135,
        58,
        80,
        196,
        10,
        188
      ]
    },
    {
      "name": "openPositionAccount",
      "discriminator": [
        199,
        227,
        20,
        81,
        238,
        230,
        138,
        29
      ]
    },
    {
      "name": "tradingAccountForArena",
      "discriminator": [
        227,
        108,
        1,
        32,
        247,
        239,
        243,
        124
      ]
    },
    {
      "name": "userProfile",
      "discriminator": [
        32,
        37,
        119,
        205,
        179,
        180,
        13,
        194
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorised",
      "msg": "You are not authorised to perform this function"
    },
    {
      "code": 6001,
      "name": "unknownUser",
      "msg": "You must create a profile first by calling create_profile method"
    },
    {
      "code": 6002,
      "name": "nameTooLong",
      "msg": "Name must be 10 characters or smaller"
    },
    {
      "code": 6003,
      "name": "assetNameTooLong",
      "msg": "Asset name must be 10 characters or smaller"
    },
    {
      "code": 6004,
      "name": "insufficientFunds",
      "msg": "Your account does not have enough funds to execute this transactions."
    },
    {
      "code": 6005,
      "name": "shortingUnsupported",
      "msg": "Shorting an asset is not supported as of now."
    }
  ],
  "types": [
    {
      "name": "arenaAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "openPositionAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "asset",
            "type": "string"
          },
          {
            "name": "quantity",
            "type": "i32"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "tradingAccountForArena",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "openPositionsCount",
            "type": "u8"
          },
          {
            "name": "usdcBalance",
            "type": "i32"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "userProfile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pubkey",
            "type": "pubkey"
          },
          {
            "name": "arenasCreatedCount",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "name",
            "type": "string"
          }
        ]
      }
    }
  ]
};
