'use client';
import React, { useState } from 'react';
import CardBox from '@/components/card/CardBox';
import SubscriberFilter from './SubscriberFilter';
import SubscriberListing from './SubscriberListing';
import { useSubscriberList, useSubscriberDelete } from '../queries';
import { filterSubscribers } from '../utils/filter-subscribers';
import { countSubscribers } from '../utils/count-subscribers';
import { DeleteSubscriberDialog } from '../components/DeleteSubscriberDialog';
import { EditSubscriberSheet } from '../components/EditSubscriberSheet';

const SubscriberList = () => {
  const {
    data: subscribers = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useSubscriberList();
  const deleteMutation = useSubscriberDelete();
  const [filter, setFilter] = useState<string>('total_subscribers');
  const [subscriberSearch, setSubscriberSearch] = useState<string>('');
  const [editingSubscriber, setEditingSubscriber] = useState<
    (typeof subscribers)[number] | null
  >(null);
  const [deletingItem, setDeletingItem] = useState<
    (typeof subscribers)[number] | null
  >(null);

  const visibleSubscribers = filterSubscribers(
    subscribers,
    filter,
    subscriberSearch,
  );
  const counts = countSubscribers(subscribers);

  if (isLoading) {
    return (
      <CardBox>
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-lg text-muted-foreground">
            Loading subscribers...
          </div>
        </div>
      </CardBox>
    );
  }

  if (isError) {
    return (
      <CardBox>
        <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
          <p className="text-lg text-error">Failed to load subscribers</p>
          {error && (
            <p className="text-sm text-muted-foreground max-w-md text-center">
              {error instanceof Error ? error.message : String(error)}
            </p>
          )}
          <button
            onClick={() => {
              void refetch();
            }}
            className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primaryemphasis"
          >
            Retry
          </button>
        </div>
      </CardBox>
    );
  }

  const handleDeleteConfirm = (id: string) => {
    deleteMutation.mutate(id, {
      onSettled: () => setDeletingItem(null),
    });
  };

  return (
    <CardBox>
      <SubscriberFilter counts={counts} filter={filter} setFilter={setFilter} />
      <SubscriberListing
        subscribers={visibleSubscribers}
        isEmpty={subscribers.length === 0}
        search={subscriberSearch}
        onSearch={setSubscriberSearch}
        onEditClick={(sub) => setEditingSubscriber(sub)}
        onDeleteClick={(sub) => setDeletingItem(sub)}
      />
      <EditSubscriberSheet
        subscriber={editingSubscriber}
        open={editingSubscriber !== null}
        onClose={() => setEditingSubscriber(null)}
      />
      <DeleteSubscriberDialog
        open={deletingItem !== null}
        deletingItem={deletingItem}
        isDeleting={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingItem(null)}
      />
    </CardBox>
  );
};

export default SubscriberList;
