import React, {
  FC,
  createContext,
  useContext,
  useCallback,
  useMemo,
  useReducer,
  Reducer,
  useEffect,
} from 'react';
import {
  Connectors,
  RejectedActivationError,
  UnsupportedChainError,
  UnsupportedConnectorError,
  useWallet,
} from 'use-wallet';
import { TokenDetailsFragment } from '../graphql/generated';
import { useMassetToken } from '../web3/hooks';
import { MassetNames, InjectedEthereum } from '../types';
import { CHAIN_ID } from '../web3/constants';

enum Actions {
  ResetWallet,
  ConnectWallet,
  ConnectWalletError,
  ConnectWalletSuccess,
  ExpandWallet,
  CollapseWallet,
  SelectMasset,
  SupportedChainSelected,
  SetOnline,
  AddNotification,
  RemoveNotification,
}

enum WalletConnectionStatus {
  Disconnected,
  Connecting,
  Connected,
}

enum Reasons {
  RejectedActivation = 'Wallet activation rejected 😢',
  UnsupportedChain = 'Unsupported network. 😢 Please connect to a supported network.',
  UnsupportedConnector = 'Unsupported connector 🤔',
  Unknown = 'Unknown error 🤔',
}

export enum StatusWarnings {
  NotOnline,
  UnsupportedChain,
}

export enum NotificationType {
  Success,
  Error,
}

export interface Notification {
  type: NotificationType;
  message: string;
}

interface State {
  wallet: {
    expanded: boolean;
    connector?: keyof Connectors;
    status: WalletConnectionStatus;
    error: Reasons | null;
    supportedChain: boolean;
  };
  online: boolean;
  selectedMasset: MassetNames;
  notifications: {
    [id: string]: Notification;
  };
}

type Action =
  | { type: Actions.SelectMasset; payload: MassetNames }
  | { type: Actions.ExpandWallet }
  | { type: Actions.CollapseWallet }
  | { type: Actions.ResetWallet }
  | { type: Actions.SupportedChainSelected; payload: boolean }
  | { type: Actions.ConnectWallet; payload: keyof Connectors }
  | { type: Actions.ConnectWalletError; payload: Reasons }
  | { type: Actions.ConnectWalletSuccess }
  | {
      type: Actions.AddNotification;
      payload: { id: string; notification: Notification };
    }
  | { type: Actions.RemoveNotification; payload: { id: string } }
  | { type: Actions.SetOnline; payload: boolean };

interface Dispatch {
  selectMasset(massetName: MassetNames): void;
  collapseWallet(): void;
  expandWallet(): void;
  resetWallet(): void;
  connectWallet(connector: keyof Connectors): void;
  addNotification(notification: Notification): void;
  removeNotification(id: string): void;
}

const reducer: Reducer<State, Action> = (state, action) => {
  switch (action.type) {
    case Actions.CollapseWallet:
      return { ...state, wallet: { ...state.wallet, expanded: false } };
    case Actions.ExpandWallet:
      return { ...state, wallet: { ...state.wallet, expanded: true } };
    case Actions.SupportedChainSelected:
      return {
        ...state,
        wallet: { ...state.wallet, supportedChain: action.payload },
      };
    case Actions.SelectMasset:
      return { ...state, selectedMasset: action.payload };
    case Actions.ResetWallet:
      return {
        ...state,
        wallet: {
          ...state.wallet,
          status: WalletConnectionStatus.Disconnected,
          error: null,
        },
      };
    case Actions.ConnectWallet:
      return {
        ...state,
        wallet: {
          ...state.wallet,
          status: WalletConnectionStatus.Connecting,
          connector: action.payload,
          error: null,
        },
      };
    case Actions.ConnectWalletError:
      return {
        ...state,
        wallet: {
          ...state.wallet,
          status: WalletConnectionStatus.Disconnected,
          error: action.payload,
        },
      };
    case Actions.ConnectWalletSuccess:
      return {
        ...state,
        wallet: {
          ...state.wallet,
          expanded: false,
          status: WalletConnectionStatus.Connected,
          error: null,
        },
      };
    case Actions.AddNotification: {
      const { id, notification } = action.payload;
      return {
        ...state,
        notifications: {
          ...state.notifications,
          [id]: notification,
        },
      };
    }
    case Actions.RemoveNotification: {
      const { [action.payload.id]: _, ...notifications } = state.notifications;
      return {
        ...state,
        notifications,
      };
    }
    case Actions.SetOnline:
      return { ...state, online: action.payload };
    default:
      return state;
  }
};

const initialState: State = {
  wallet: {
    expanded: false,
    status: WalletConnectionStatus.Disconnected,
    error: null,
    supportedChain: true,
  },
  selectedMasset: MassetNames.mUSD,
  online: true,
  notifications: {},
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const context = createContext<[State, Dispatch]>([initialState, {}] as any);

/**
 * Provider for global App state and interactions.
 */
export const AppProvider: FC<{}> = ({ children }) => {
  const { activate, deactivate } = useWallet<InjectedEthereum>();
  const [state, dispatch] = useReducer(reducer, initialState);

  const collapseWallet = useCallback<Dispatch['collapseWallet']>(() => {
    dispatch({ type: Actions.CollapseWallet });
  }, [dispatch]);

  const expandWallet = useCallback<Dispatch['expandWallet']>(() => {
    dispatch({ type: Actions.ExpandWallet });
  }, [dispatch]);

  const selectMasset = useCallback<Dispatch['selectMasset']>(
    massetName => {
      dispatch({ type: Actions.SelectMasset, payload: massetName });
    },
    [dispatch],
  );

  const resetWallet = useCallback<Dispatch['resetWallet']>(() => {
    deactivate();
    dispatch({ type: Actions.ResetWallet });
  }, [dispatch, deactivate]);

  const connectWallet = useCallback<Dispatch['connectWallet']>(
    selected => {
      dispatch({ type: Actions.ConnectWallet, payload: selected });
      activate(selected)
        .then(() => {
          dispatch({ type: Actions.ConnectWalletSuccess });
        })
        .catch(error => {
          let reason: Reasons;

          if (error instanceof RejectedActivationError) {
            reason = Reasons.RejectedActivation;
          } else if (error instanceof UnsupportedChainError) {
            reason = Reasons.UnsupportedChain;
          } else if (error instanceof UnsupportedConnectorError) {
            reason = Reasons.UnsupportedConnector;
          } else {
            reason = Reasons.Unknown;
          }

          dispatch({
            type: Actions.ConnectWalletError,
            payload: reason,
          });
        });
    },
    [activate],
  );

  const connectionListener = useCallback(() => {
    dispatch({
      type: Actions.SetOnline,
      payload: window.navigator.onLine,
    });
  }, [dispatch]);

  const addNotification = useCallback(
    (notification: Notification) => {
      const id = Math.random().toString();

      dispatch({
        type: Actions.AddNotification,
        payload: { id, notification },
      });

      // Remove the notification after a delay
      setTimeout(() => {
        dispatch({ type: Actions.RemoveNotification, payload: { id } });
      }, 5000);
    },
    [dispatch],
  );

  const removeNotification = useCallback(
    (id: string) => {
      dispatch({ type: Actions.RemoveNotification, payload: { id } });
    },
    [dispatch],
  );

  /**
   * Detect internet connection (or lack thereof)
   */
  useEffect((): (() => void) => {
    window.addEventListener('offline', connectionListener);
    window.addEventListener('online', connectionListener);
    return () => {
      window.removeEventListener('offline', connectionListener);
      window.removeEventListener('online', connectionListener);
    };
  }, [connectionListener]);

  /**
   * Detect supported chain ID when the injected provider changes network.
   * This will be deprecated fairly soon:
   * https://docs.metamask.io/guide/ethereum-provider.html#methods-current-api
   */
  useEffect(() => {
    let networkChangedListener: (chainId: number | string) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const injected = (window as any).ethereum;

    if (injected) {
      networkChangedListener = chainId => {
        const supported = CHAIN_ID === parseInt(chainId as string, 10);
        dispatch({ type: Actions.SupportedChainSelected, payload: supported });
      };
      networkChangedListener(parseInt(injected.chainId, 16));

      injected.on('networkChanged', networkChangedListener);
      injected.autoRefreshOnNetworkChange = false;
    }

    return () => {
      if (injected && networkChangedListener) {
        injected.removeListener('networkChanged', networkChangedListener);
      }
    };
  }, [dispatch]);

  return (
    <context.Provider
      value={useMemo(
        () => [
          state,
          {
            addNotification,
            removeNotification,
            collapseWallet,
            expandWallet,
            selectMasset,
            connectWallet,
            resetWallet,
          },
        ],
        [
          state,
          addNotification,
          removeNotification,
          collapseWallet,
          expandWallet,
          selectMasset,
          resetWallet,
          connectWallet,
        ],
      )}
    >
      {children}
    </context.Provider>
  );
};

export const useAppContext = (): [State, Dispatch] => useContext(context);

export const useAppState = (): State => useAppContext()[0];

export const useWalletState = (): State['wallet'] => useAppState().wallet;

export const useIsWalletConnected = (): boolean =>
  useWalletState().status === WalletConnectionStatus.Connected;

export const useIsWalletConnecting = (): boolean =>
  useWalletState().status === WalletConnectionStatus.Connecting;

export const useWalletExpanded = (): State['wallet']['expanded'] =>
  useWalletState().expanded;

export const useAppDispatch = (): Dispatch => useAppContext()[1];

export const useCollapseWallet = (): Dispatch['collapseWallet'] =>
  useAppDispatch().collapseWallet;

export const useAddSuccessNotification = (): ((message: string) => void) => {
  const add = useAppDispatch().addNotification;
  return useCallback(
    (message: string) => {
      add({ type: NotificationType.Success, message });
    },
    [add],
  );
};

export const useAddErrorNotification = (): ((message: string) => void) => {
  const add = useAppDispatch().addNotification;
  return useCallback(
    (message: string) => {
      add({ type: NotificationType.Error, message });
    },
    [add],
  );
};

export const useRemoveNotification = (): Dispatch['removeNotification'] =>
  useAppDispatch().removeNotification;

export const useAppStatusWarnings = (): StatusWarnings[] => {
  const {
    online,
    wallet: { supportedChain },
  } = useAppState();

  return useMemo(() => {
    const warnings = [];

    if (!online) warnings.push(StatusWarnings.NotOnline);
    if (!supportedChain) warnings.push(StatusWarnings.UnsupportedChain);

    return warnings;
  }, [online, supportedChain]);
};

export const useExpandWallet = (): Dispatch['expandWallet'] =>
  useAppDispatch().expandWallet;

export const useResetWallet = (): Dispatch['resetWallet'] =>
  useAppDispatch().resetWallet;

export const useSelectMasset = (): Dispatch['selectMasset'] =>
  useAppDispatch().selectMasset;

export const useSelectedMassetToken = (): TokenDetailsFragment | null => {
  const [{ selectedMasset }] = useAppContext();
  return useMassetToken(selectedMasset);
};
