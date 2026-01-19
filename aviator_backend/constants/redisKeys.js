// constants/redisKeys.js

const REDIS_KEYS = {
  CURRENT_GAME_BETS_HASH: "aviator:game:current:bets",
  NEXT_GAME_BETS_HASH: "aviator:game:next:bets",

  CURRENT_GAME_TOTAL_BETS: "aviator:game:current:total_bets",
  NEXT_GAME_TOTAL_BETS: "aviator:game:next:total_bets",

  AVIATOR_GAME_STATE: "aviator:game:state",
  AVIATOR_MULTIPLIER: "aviator:game:multiplier",

  GAME_ORDER_ID: "aviator:game:orderid",
};

module.exports={REDIS_KEYS}
