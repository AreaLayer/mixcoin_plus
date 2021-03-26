import { useDebounce } from 'ahooks';
import PullComponent from 'apps/application/components/PullComponent/PullComponent';
import TabbarComponent from 'apps/application/components/TabbarComponent/TabbarComponent';
import { useCurrentUser } from 'apps/application/contexts';
import { useOceanMarketConnectionQuery } from 'graphqlTypes';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router';
import { ActivityIndicator, Message, SearchBar } from 'zarm';

export function MarketsComponent(props: { type: string }) {
  const history = useHistory();
  const { t } = useTranslation();
  const { currentUser } = useCurrentUser();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, { wait: 500 });
  const { loading, data, refetch, fetchMore } = useOceanMarketConnectionQuery({
    variables: { type: props.type, query: debouncedQuery },
  });

  if (loading) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <ActivityIndicator size='lg' />
      </div>
    );
  }

  const {
    oceanMarketConnection: {
      nodes: markets,
      pageInfo: { hasNextPage, endCursor },
    },
  } = data;
  return (
    <>
      <SearchBar
        value={query}
        onChange={(value: string) => setQuery(value)}
        onClear={() => setQuery('')}
        onCancel={() => setQuery('')}
      />
      {!currentUser && (
        <Message size='lg' theme='warning'>
          {t('connect_wallet_to_exhange')}
          <a
            className='mx-1 font-semibold'
            onClick={() => location.replace('/login')}
          >
            {t('connect_wallet')}
          </a>
        </Message>
      )}
      <PullComponent
        refetch={refetch}
        fetchMore={() => fetchMore({ variables: { after: endCursor } })}
        hasNextPage={hasNextPage}
      >
        {markets.map((market) => (
          <div
            onClick={() => history.push(`/markets/${market.id}`)}
            key={market.marketId}
            className='flex items-center px-4 py-2'
          >
            <img
              className='w-10 h-10 mr-2 rounded-full'
              src={market.baseAsset.iconUrl.replace(/s128$/, 's64')}
            />
            <div className='flex items-baseline'>
              <div className='mr-1 text-lg font-semibold'>
                {market.baseAsset.symbol}
              </div>
              <div className='text-xs'>/{market.quoteAsset.symbol}</div>
            </div>
            <div className='ml-auto text-right'>
              {market.baseAsset.changeUsd && (
                <div
                  className={`${
                    market.baseAsset.changeUsd > 0
                      ? 'text-green-500'
                      : 'text-red-500'
                  }`}
                >
                  {(market.baseAsset.changeUsd * 100)?.toFixed(2)}%
                </div>
              )}
              {market.baseAsset.priceUsd && (
                <div className='text-xs text-gray-300'>
                  ≈ ${market.baseAsset.priceUsd?.toFixed(2)}
                </div>
              )}
            </div>
          </div>
        ))}
      </PullComponent>
      <TabbarComponent activeTabKey='home' />
    </>
  );
}