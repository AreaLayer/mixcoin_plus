import { OceanMarket } from 'graphqlTypes';
import axios from 'axios';
import BigNumber from 'bignumber.js';
import pako from 'pako';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useWebSocket from 'react-use-websocket';
import { v4 as uuid } from 'uuid';
import { ActivityIndicator } from 'zarm';

const oceanApi = axios.create({
  baseURL: 'https://events.ocean.one/',
  timeout: 1000,
});

function fetchTrades(marketId: string, offset?: string, limit?: number) {
  return oceanApi.get(
    `/markets/${marketId}/trades?order=DESC&limit=${limit || 50}&offset=${
      offset || new Date().toISOString()
    }`,
  );
}

const ENDPOINT = 'wss://events.ocean.one';

interface ITick {
  amount: string;
  funds: string;
  price: string;
  side: 'ASK' | 'BID';
}

interface ITrade {
  amount: string;
  base: string;
  created_at: string;
  price: string;
  quote: string;
  side: 'ASK' | 'BID';
  trade_id: string;
}
BigNumber.config({
  FORMAT: {
    decimalSeparator: '.',
    groupSeparator: ',',
    groupSize: 3,
    secondaryGroupSize: 0,
  },
});

export default function BookComponent(props: {
  market: Partial<OceanMarket>;
  setOrderPrice: (params: any) => any;
  setOrderAmount: (params: any) => any;
}) {
  const { t } = useTranslation();
  const { market, setOrderPrice, setOrderAmount } = props;
  const [connected, setConnected] = useState(false);
  const [book, setBook] = useState<{
    asks: ITick[];
    bids: ITick[];
  }>({ asks: [], bids: [] });
  const [trades, setTrades] = useState<ITrade[]>([]);

  async function refreshTrades() {
    const res = await fetchTrades(market.marketId);
    if (res.data && res.data.data) {
      setTrades(res.data.data);
    }
  }

  function handleOrderOpenOnBook(tick: ITick) {
    const price = new BigNumber(tick.price);
    const amount = new BigNumber(tick.amount);
    const { asks, bids } = book;

    if (tick.side === 'ASK') {
      for (let i = 0; i < book.asks.length; i++) {
        const bo = book.asks[i];
        const bp = new BigNumber(bo.price);
        if (bp.isEqualTo(price)) {
          bo.amount = new BigNumber(bo.amount).plus(amount).toFixed(4);
          return;
        }
        if (bp.isGreaterThan(price)) {
          book.asks.splice(i, 0, tick);
          return;
        }
      }
      asks.push(tick);
    } else if (tick.side === 'BID') {
      for (let i = 0; i < book.bids.length; i++) {
        const bo = book.bids[i];
        const bp = new BigNumber(bo.price);
        if (bp.isEqualTo(price)) {
          bo.amount = new BigNumber(bo.amount).plus(amount).toFixed(4);
          return;
        }
        if (bp.isLessThan(price)) {
          book.bids.splice(i, 0, tick);
          return;
        }
      }
      bids.push(tick);
    }
    setBook(Object.assign({}, { asks, bids }));
  }

  function handleOrderRemoveFromBook(tick: ITick) {
    const price = new BigNumber(tick.price);
    const amount = new BigNumber(tick.amount);

    const { asks, bids } = book;
    if (tick.side === 'BID') {
      const index = bids.findIndex((bid) =>
        new BigNumber(bid.price).isEqualTo(price),
      );
      if (index > -1) {
        bids[index].amount = new BigNumber(bids[index].amount)
          .minus(amount)
          .toFixed(4);
        if (bids[index].amount === '0.0000') {
          bids.splice(index, 1);
        }
      }
    } else if (tick.side === 'ASK') {
      const index = asks.findIndex((ask) =>
        new BigNumber(ask.price).isEqualTo(price),
      );
      if (index > -1) {
        asks[index].amount = new BigNumber(asks[index].amount)
          .minus(amount)
          .toFixed(4);
        if (asks[index].amount === '0.0000') {
          asks.splice(index, 1);
        }
      }
    }

    setBook(Object.assign({}, { asks, bids }));
  }

  function handleMessage(raw: string) {
    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      msg = {};
    }
    switch (msg.data.event) {
      case 'BOOK-T0':
        const { asks, bids } = msg.data.data;
        setBook({ asks: asks.slice(0, 1000), bids: bids.slice(0, 1000) });
        setConnected(true);
        break;
      case 'HEARTBEAT':
        return;
      case 'ORDER-OPEN':
        handleOrderOpenOnBook(msg.data.data);
        break;
      case 'ORDER-CANCEL':
        handleOrderRemoveFromBook(msg.data.data);
        break;
      case 'ORDER-MATCH':
        handleOrderRemoveFromBook(msg.data.data);
        break;
    }
  }

  const { sendMessage } = useWebSocket(ENDPOINT, {
    onMessage: (event) => {
      const fileReader = new FileReader();
      fileReader.onload = (e: any) => {
        const msg = pako.ungzip(new Uint8Array(e.target.result), {
          to: 'string',
        });
        handleMessage(msg);
      };
      fileReader.readAsArrayBuffer(event.data);
    },
    onOpen: () => {
      const msg = {
        action: 'SUBSCRIBE_BOOK',
        id: uuid().toLowerCase(),
        params: { market: market.marketId },
      };
      sendMessage(pako.gzip(JSON.stringify(msg)));
    },
    reconnectAttempts: Infinity,
    reconnectInterval: 1000,
    retryOnError: true,
    shouldReconnect: () => true,
  });

  const parseNumber = (str: string) => {
    const number = new BigNumber(str);
    if (number.isLessThan(1)) {
      return number.toFixed(8);
    } else if (number.isLessThan(10)) {
      return number.toFixed(6);
    } else if (number.isLessThan(100)) {
      return number.toFixed(4);
    } else if (number.isLessThan(10000)) {
      return number.toFixed(2);
    } else {
      return number.toFixed(0);
    }
  };

  useEffect(() => {
    refreshTrades();
  }, [book, market]);

  return (
    <>
      <div className='h-48 text-xs'>
        <div className='flex items-center justify-between mb-2'>
          <div>
            {t('price')}({market.quoteAsset.symbol})
          </div>
          <div>
            {t('volume')}({market.baseAsset.symbol})
          </div>
        </div>
        {book.asks.length > 0 ? (
          book.asks
            .slice(0, 10)
            .reverse()
            .map((ask, index) => (
              <div
                key={index}
                className='flex items-center justify-between'
                onClick={() => {
                  setOrderPrice(new BigNumber(ask.price).toFixed(8));
                  setOrderAmount(new BigNumber(ask.amount).toFixed(8));
                }}
              >
                <div className='text-green-500'>{parseNumber(ask.price)}</div>
                <div className='text-gray-700'>{parseNumber(ask.amount)}</div>
              </div>
            ))
        ) : connected ? (
          <div className='text-center text-green-500'>{t('no_ask_order')}</div>
        ) : (
          <div className='flex p-4'>
            <ActivityIndicator type='spinner' className='m-auto' />
          </div>
        )}
      </div>
      <div className='h-48 text-xs'>
        <div className='flex items-center justify-between p-1 mb-2 bg-gray-200'>
          <div
            className={`${
              trades[0]?.side === 'ASK' ? 'text-green-500' : 'text-red-500'
            } font-bold`}
          >
            {trades[0]?.price || '-'}
          </div>
          {trades[0] && (
            <div className='px-2 text-gray-500'>
              ≈{' $'}
              {(
                market.quoteAsset.priceUsd * parseFloat(trades[0].price) || 0
              ).toFixed(4)}
            </div>
          )}
        </div>
        {book.bids.length > 0 ? (
          book.bids.slice(0, 10).map((bid, index) => (
            <div
              key={index}
              className='flex items-center justify-between'
              onClick={() => {
                setOrderPrice(new BigNumber(bid.price).toFixed(8));
                setOrderAmount(new BigNumber(bid.amount).toFixed(8));
              }}
            >
              <div className='text-red-500'>{parseNumber(bid.price)}</div>
              <div className='text-gray-700'>{parseNumber(bid.amount)}</div>
            </div>
          ))
        ) : connected ? (
          <div className='text-center text-red-500'>{t('no_bid_order')}</div>
        ) : (
          <div className='flex p-4'>
            <ActivityIndicator type='spinner' className='m-auto' />
          </div>
        )}
      </div>
    </>
  );
}