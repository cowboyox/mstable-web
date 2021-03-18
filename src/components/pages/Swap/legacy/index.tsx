import React, { FC, useCallback } from 'react';
import { BigNumber } from 'ethers';
import Skeleton from 'react-loading-skeleton';

import { MassetStats } from '../../../stats/MassetStats';
import { TransactionManifest } from '../../../../web3/TransactionManifest';
import { useOwnAccount } from '../../../../context/UserProvider';
import { TransactionForm } from '../../../forms/TransactionForm';
import { SwapProvider, useSwapState } from './SwapProvider';
import { SwapInput } from './SwapInput';
import { SwapConfirm } from './SwapConfirm';
import { Interfaces } from '../../../../types';
import { useSelectedLegacyMassetContract } from '../../../../web3/hooks';
import { PageAction, PageHeader } from '../../PageHeader';
import { MassetPage } from '../../MassetPage';
import { useSelectedMassetState } from '../../../../context/DataProvider/DataProvider';

const SwapForm: FC = () => {
  const account = useOwnAccount();
  const {
    valid,
    values: { output, input },
    massetState,
  } = useSwapState();
  const contract = useSelectedLegacyMassetContract();

  const { address: mAssetAddress } = massetState || {};

  const isMint = output.token.address && output.token.address === mAssetAddress;

  // Set the form manifest
  const createTransaction = useCallback(
    (
      formId: string,
    ): TransactionManifest<Interfaces.LegacyMasset, 'mint' | 'swap'> | void => {
      if (valid && account && contract) {
        if (isMint) {
          const body = `${output.amount.simple} ${output.token.symbol} with ${input.token.symbol}`;
          return new TransactionManifest(
            contract,
            'mint',
            [input.token.address as string, input.amount.exact as BigNumber],
            {
              present: `Minting ${body}`,
              past: `Minted ${body}`,
            },
            formId,
          );
        }

        const body = `${input.amount.simple} ${input.token.symbol} for ${output.token.symbol}`;
        return new TransactionManifest(
          contract,
          'swap',
          [
            input.token.address as string,
            output.token.address as string,
            input.amount.exact as BigNumber,
            account,
          ],
          {
            present: `Swapping ${body}`,
            past: `Swapped ${body}`,
          },
          formId,
        );
      }
    },
    [
      account,
      contract,
      input.amount.exact,
      input.amount.simple,
      input.token.address,
      input.token.symbol,
      isMint,
      output.amount.simple,
      output.token.address,
      output.token.symbol,
      valid,
    ],
  );

  return (
    <TransactionForm
      formId="swap"
      confirm={<SwapConfirm />}
      confirmLabel="Swap"
      createTransaction={createTransaction}
      input={<SwapInput />}
      valid={valid}
    />
  );
};

export const Swap: FC = () => {
  const massetState = useSelectedMassetState();
  return massetState ? (
    <SwapProvider>
      <PageHeader
        action={PageAction.Swap}
        subtitle="Exchange stablecoins with zero-slippage"
      />
      <MassetPage asideVisible>
        <SwapForm />
        <MassetStats />
      </MassetPage>
    </SwapProvider>
  ) : (
    <Skeleton height={400} />
  );
};
