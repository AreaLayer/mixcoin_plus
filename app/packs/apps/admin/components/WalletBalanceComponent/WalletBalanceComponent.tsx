import {
  UserAsset,
  useAdminWalletBalanceQuery,
  useAdminArbitragerWithrawBalanceMutation,
} from 'graphqlTypes';
import { Avatar, Button, Table, Popconfirm, message } from 'antd';
import { ColumnProps } from 'antd/es/table';
import React from 'react';
import LoadingComponent from '../LoadingComponent/LoadingComponent';

export default function WalletBalanceComponent(props: { userId?: string }) {
  const { userId } = props;
  const { loading, data, refetch } = useAdminWalletBalanceQuery({
    fetchPolicy: 'network-only',
    variables: { userId },
  });
  const [withdrawBalance, { loading: withrawing }] =
    useAdminArbitragerWithrawBalanceMutation({
      update: (_, { data: { adminArbitragerWithrawBalance } }) => {
        if (adminArbitragerWithrawBalance) {
          message.success('success');
          refetch();
        } else {
          message.error('faied');
        }
      },
    });
  if (loading) {
    return <LoadingComponent />;
  }
  const { adminWalletBalance: assets } = data;

  const columns: Array<ColumnProps<UserAsset>> = [
    { title: 'asset ID', dataIndex: 'assetId', key: 'assetId' },
    {
      dataIndex: 'iconUrl',
      key: 'iconUrl',
      render: (text, asset) => <Avatar src={text}>{asset.symbol[0]}</Avatar>,
      title: 'icon',
    },
    { title: 'Symbol', dataIndex: 'symbol', key: 'symbol' },
    { title: 'Balance', dataIndex: 'balance', key: 'balance' },
    {
      dataIndex: 'priceUsd',
      key: 'priceUsd',
      render: (text, asset) => {
        return asset.balance > 0 ? `$ ${parseFloat(text) * asset.balance}` : 0;
      },
      title: 'Value',
    },
    {
      dataIndex: 'actions',
      key: 'actions',
      render: (_, asset) => (
        <Popconfirm
          title='Are you sure to withraw?'
          onConfirm={() =>
            withdrawBalance({
              variables: {
                input: {
                  mixinUuid: userId,
                  assetId: asset.assetId,
                },
              },
            })
          }
        >
          <Button type='link' disabled={withrawing}>
            Withraw
          </Button>
        </Popconfirm>
      ),
      title: 'Actions',
    },
  ];
  return (
    <>
      <div className='flex justify-end mb-4'>
        <Button type='primary' onClick={() => refetch()}>
          Refresh
        </Button>
      </div>
      <Table
        scroll={{ x: true }}
        columns={columns}
        dataSource={assets}
        rowKey='assetId'
        loading={loading}
        pagination={{ pageSize: 50 }}
        size='small'
      />
    </>
  );
}
