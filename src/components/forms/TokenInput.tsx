import React, {
  FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import styled from 'styled-components';
import useOnClickOutside from 'use-onclickoutside';
import { TokenDetailsFragment } from '../../graphql/generated';
import { TokenIcon } from '../icons/TokenIcon';

interface Props {
  name: string;
  value: string | null;
  tokens: TokenDetailsFragment[];
  onChange?(name: string, token: TokenDetailsFragment | null): void;
  error?: string;
  disabled?: boolean;
}

interface TokenOptionProps {
  address: string;
  symbol: string;
  selected?: boolean;
  onClick?(address: string): void;
}

const Container = styled.div<Pick<Props, 'error'>>`
  cursor: pointer;
  background: ${({ error, theme }) =>
    error ? theme.color.redTransparent : theme.color.white};
  outline: 0;
  border: 2px
    ${({ theme, error }) =>
      error ? theme.color.red : theme.color.blackTransparent}
    solid;
  border-radius: 4px;
  color: ${({ theme }) => theme.color.foreground};
  font-size: ${({ theme }) => theme.fontSize.l};
  font-weight: bold;
  height: 3rem;
  min-width: 150px;
  user-select: none;
`;

const RelativeContainer = styled.div`
  position: relative;
  overflow: visible;
`;

const OptionsContainer = styled.div<{ open: boolean }>`
  display: ${({ open }) => (open ? 'block' : 'none')};
  position: absolute;

  // Offset parent border, even with box-sizing: border-box
  top: -2px;
  left: -2px;
  right: -2px;

  background: ${({ theme }) => theme.color.white};
  border: 2px ${({ theme }) => theme.color.blackTransparent} solid;
  border-radius: 0 0 4px 4px;
`;

const OptionContainer = styled.div<Pick<TokenOptionProps, 'selected'>>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 44px;

  padding: ${({ theme }) => theme.spacing.xs};

  background: ${({ selected, theme }) =>
    selected ? theme.color.blueTransparent : 'transparent'};

  &:hover {
    background: ${({ theme }) => theme.color.blueTransparent};
  }

  > img {
    width: 30px;
    margin-right: ${({ theme }) => theme.spacing.xs};
  }
`;

const TokenSymbol = styled.div`
  width: 100%;
`;

const Placeholder = styled(OptionContainer)`
  font-size: ${({ theme }) => theme.fontSize.m};
`;

const Option: FC<TokenOptionProps> = ({
  address,
  symbol,
  selected,
  onClick,
}) => {
  const handleClick = useCallback(() => {
    onClick?.(address);
  }, [onClick, address]);
  return (
    <OptionContainer onClick={handleClick} selected={selected}>
      <TokenIcon symbol={symbol} />
      <TokenSymbol>{symbol}</TokenSymbol>
    </OptionContainer>
  );
};

const placeholderText = 'Select a token';

/**
 * TokenInput form component
 * Select a token from a given list of tokens.
 *
 * @param name Name of the field, e.g. 'input'
 * @param error Error message
 * @param value Selected token address value (address)
 * @param tokens Available tokens (list of addresses)
 * @param onChange Optional callback for change event
 * @param disabled Optional flag to disable the input
 */
export const TokenInput: FC<Props> = ({
  name,
  value,
  tokens,
  onChange,
  disabled = false,
  error,
}) => {
  const [open, setOpen] = useState<boolean>(false);

  const handleClickOutside = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      setOpen(!open);
    }
  }, [open, setOpen, disabled]);

  const handleUnset = useCallback(() => {
    onChange?.(name, null);
  }, [onChange, name]);

  const handleSelect = useCallback(
    (address: string) => {
      const selected = tokens.find(t => t.address === address);
      if (selected) {
        onChange?.(name, selected);
      }
    },
    [onChange, name, tokens],
  );

  const handleKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClickOutside();
      }
    },
    [handleClickOutside],
  );

  const container = useRef(null);

  useOnClickOutside(container, handleClickOutside);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
    };
  }, [handleKeyPress]);

  const selectedToken = useMemo(
    () => (value ? tokens.find(t => t.address === value) : null),
    [tokens, value],
  );

  return (
    <Container onClick={handleClick} ref={container} error={error}>
      {selectedToken ? (
        <Option address={selectedToken.address} symbol={selectedToken.symbol} />
      ) : (
        <Placeholder onClick={handleUnset}>{placeholderText}</Placeholder>
      )}
      <RelativeContainer>
        <OptionsContainer open={open}>
          {value ? (
            <Placeholder onClick={handleUnset}>{placeholderText}</Placeholder>
          ) : null}
          {tokens.map(({ address, symbol }) => (
            <div key={address}>
              <Option
                address={address}
                symbol={symbol}
                selected={address === value}
                onClick={handleSelect}
              />
            </div>
          ))}
        </OptionsContainer>
      </RelativeContainer>
    </Container>
  );
};
