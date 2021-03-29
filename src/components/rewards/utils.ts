import { BigDecimal } from '../../web3/BigDecimal';

// Boost params
const MAX_BOOST = 3;
const MIN_BOOST = 1;
const COEFFICIENT = 6;
const EXPONENT = 0.875;

export const calculateBoost = (
  stakingBalance?: BigDecimal,
  vMTABalance?: BigDecimal,
): number => {
  if (
    vMTABalance &&
    stakingBalance &&
    vMTABalance.simple > 0 &&
    stakingBalance.simple > 0
  ) {
    const boost =
      MIN_BOOST +
      (COEFFICIENT * vMTABalance.simple) / stakingBalance.simple ** EXPONENT;
    return Math.min(MAX_BOOST, boost);
  }
  return MIN_BOOST;
};

export const calculateVMTAForMaxBoost = (
  stakingBalance: BigDecimal,
): number | undefined => {
  const vMTA =
    ((MAX_BOOST - MIN_BOOST) / COEFFICIENT) * stakingBalance.simple ** EXPONENT;
  return vMTA !== 0 ? vMTA : undefined;
};
