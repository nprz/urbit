import React, { MouseEvent, ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Associations, resourceAsPath } from '@urbit/api';
import _ from 'lodash';
import { DragDropContext } from 'react-beautiful-dnd';

import { SidebarAssociationItem, SidebarDmItem, SidebarItemBase, SidebarPendingItem } from './SidebarItem';
import useGraphState, { useInbox } from '~/logic/state/graph';
import useHarkState from '~/logic/state/hark';
import { getFeedPath, getResourcePath, modulo } from '~/logic/lib/util';
import { SidebarListConfig } from './types';
import { Workspace } from '~/types/workspace';
import useMetadataState, { usePreview } from '~/logic/state/metadata';
import { useHistory } from 'react-router';
import useSettingsState, { useShortcut } from '~/logic/state/settings';
import useGroupState from '~/logic/state/group';
import useInviteState from '~/logic/state/invite';
import { getGraphUnreads, sortGroupsAlph } from '~/views/apps/launch/components/Groups';
import { Box, Icon, LoadingSpinner } from '@tlon/indigo-react';
import { useQuery } from '~/logic/lib/useQuery';
import { IS_MOBILE } from '~/logic/lib/platform';
import { dmUnreads, getItems, sidebarSort } from './util';
import { GroupOrder, SidebarGroupSorter } from './SidebarGroupSorter';

function SidebarGroup({ baseUrl, selected, config, workspace, title }: {
  config: SidebarListConfig;
  baseUrl: string;
  selected?: string;
  title?: string;
  workspace: Workspace;
}): ReactElement {
  const groupRef = useRef<HTMLElement>(null);
  const isMessages = workspace.type === 'messages';
  const isHome = workspace.type === 'home';
  const isGroup = workspace.type === 'group';
  const groupSelected =
    (isMessages && baseUrl.includes('messages')) ||
    (isHome && baseUrl.includes('home')) ||
    (workspace.type === 'group' && (baseUrl.replace('/~landscape', '') === workspace.group || baseUrl.includes(`${workspace.group}/resource`)));
  const [collapsed, setCollapsed] = useState(!groupSelected && !isMessages);

  useEffect(() => {
    if (isGroup && groupSelected && groupRef.current) {
      groupRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isGroup, groupSelected, groupRef]);

  const associations = useMetadataState(state => state.associations);
  const groups = useGroupState(s => s.groups);
  const inbox = useInbox();
  const pendingDms = useGraphState(s => [...s.pendingDms].map(s => `~${s}`));
  const graphKeys = useGraphState(s => s.graphKeys);
  const pendingGroupChats = useGroupState(s => _.pickBy(s.pendingJoin, (req, rid) => !(rid in groups) && req.app === 'graph'));
  const inviteGroupChats = useInviteState(
    s => Object.values(s.invites?.['graph'] || {})
    .map(inv => `/ship/~${inv.resource.ship}/${inv.resource.name}`).filter(group => !(group in groups))
  );
  const pending = [...pendingDms, ...Object.keys(pendingGroupChats), ...inviteGroupChats];
  const { unreads, unseen } = useHarkState();

  const ordered = getItems(associations, workspace, inbox, pending)
    .sort(sidebarSort(unreads, pending)[config.sortBy]);

  const history = useHistory();

  const cycleChannels = useCallback((backward: boolean) => {
    const idx = ordered.findIndex(s => s === selected);
    const offset = backward ? -1 : 1;

    const newIdx = modulo(idx+offset, ordered.length - 1);
    const newChannel = ordered[newIdx];
    let path = '';
    if(newChannel.startsWith('~')) {
      path = `/~landscape/messages/dm/${newChannel}`;
    } else {
      const association = associations.graph[ordered[newIdx]];
      if(!association) {
        path = '/~landscape/messages';
        return;
      } else {
        const { metadata, resource } = association;
        const joined = graphKeys.has(resource.slice(7));
        if ('graph' in metadata.config) {
          path = getResourcePath(workspace, resource, joined, metadata.config.graph);
        }
      }
    }
    history.push(path);
  }, [ordered, selected, history.push]);

  useShortcut('cycleForward', useCallback((e: KeyboardEvent) => {
    cycleChannels(false);
    e.preventDefault();
  }, [cycleChannels]));

  useShortcut('cycleBack', useCallback((e: KeyboardEvent) => {
    cycleChannels(true);
    e.preventDefault();
  }, [cycleChannels]));

  let hasNotification = false;
  if (workspace.type === 'group') {
    for (const key in unseen) {
      const formattedKey = key.replace('landscape/graph', '/ship').replace('/mention', '');
      if (associations.graph[formattedKey]?.group === workspace?.group) {
        hasNotification = true;
        break;
      }
    }
  }
  const graphUnreads = getGraphUnreads(associations || ({} as Associations));
  const groupPath = isGroup ? workspace.group : '';
  const unreadCount = isGroup ? graphUnreads(groupPath) : dmUnreads(unreads);
  const hasUnread = unreadCount > 0;
  const isSynced = true;
  const isPending = false;
  const to = `/~landscape${isGroup ? workspace?.group : isMessages ? '/messages' : '/home'}`;
  const isMobileMessages = IS_MOBILE && isMessages;
  const groupTitle = title ? title : isHome ? 'My Channels' : 'Messages';
  const association = isGroup ? associations?.groups[workspace.group] : undefined;
  const feedPath = getFeedPath(association);

  return (
    <Box ref={groupRef}>
      {!isMobileMessages && <SidebarItemBase
        to={to}
        selected={groupSelected}
        hasUnread={hasUnread}
        unreadCount={unreadCount}
        isSynced={isSynced}
        title={groupTitle}
        hasNotification={hasNotification}
        pending={isPending}
        onClick={() => setCollapsed(isMessages ? false : !collapsed)}
        isGroup
      >
        {!isMessages && (
          <Icon
            p={1}
            pr="0"
            display="block"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCollapsed(!collapsed);
            }}
            icon={collapsed ? 'TriangleEast' : 'TriangleSouth'}
          />
        )}
      </SidebarItemBase>}
      {!collapsed && (
        <Box>
          {feedPath && IS_MOBILE && <SidebarItemBase
            to={`/~landscape${groupPath}/feed`}
            selected={history.location.pathname.includes('feed')}
            title="Group Feed"
            groupSelected={groupSelected}
            fontSize="13px"
            isSynced
            hasNotification={false} // How to get notifications and unreads for this?
            hasUnread={false}
            unreadCount={0}
            // unreadCount={count + each.length}
            // hasNotification={Boolean(unseen?.[`landscape${pathAsGraph}/mention`])}
            indent={1}
          >
            <Icon display="block" color="black" icon="Collection" />
          </SidebarItemBase>}
          {ordered.map((pathOrShip) => {
            const pathAsGraph = pathOrShip.replace('ship', 'graph');
            const { count, each } = unreads[pathAsGraph] || { count: 0, each: [] };

            return pathOrShip.startsWith('~') ? (
                <SidebarDmItem
                  key={pathOrShip}
                  ship={pathOrShip}
                  workspace={workspace}
                  selected={pathOrShip === selected}
                  pending={pending.includes(pathOrShip)}
                  indent={0.5}
                />
              ) : pending.includes(pathOrShip) ? (
                <SidebarPendingItem
                  key={pathOrShip}
                  path={pathOrShip}
                  selected={pathOrShip === selected}
                  indent={1}
                />
              ) : (
              <SidebarAssociationItem
                key={pathOrShip}
                selected={pathOrShip === selected}
                groupSelected={groupSelected}
                association={associations.graph[pathOrShip]}
                hideUnjoined={config.hideUnjoined}
                fontSize="13px"
                workspace={workspace}
                unreadCount={count + each.length}
                hasNotification={Boolean(unseen?.[`landscape${pathAsGraph}/mention`])}
                indent={isMessages ? 0.5 : 1}
              />
              );
          })}
        </Box>
      )}
    </Box>
  );
}

interface PendingSidebarGroupProps {
  path: string;
}

function PendingSidebarGroup({ path }: PendingSidebarGroupProps) {
  const history = useHistory();
  const { preview, error } = usePreview(path);
  const title = preview?.metadata?.title || path;
  const { toQuery } = useQuery();
  const onClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    history.push(toQuery({ 'join-kind': 'groups', 'join-path': path }));
  };

  const joining = useGroupState(s => s.pendingJoin[path]?.progress);
  const isJoining = Boolean(joining && joining !== 'done');

  return (
    <SidebarItemBase
      to="/"
      onClick={onClick}
      title={title}
      selected={false}
      pending={isJoining}
      hasUnread={false}
      hasNotification={!joining}
      isSynced={!joining}
      isGroup
    />
  );
}

export function SidebarGroupList({
  messages = false,
  changingSort = false,
  ...props
}: {
  config: SidebarListConfig;
  baseUrl: string;
  changingSort?: boolean;
  selected?: string;
  messages?: boolean;
}): ReactElement {
  const { associations } = useMetadataState();
  const { groups } = useGroupState();
  const { groupSorter, putEntry } = useSettingsState.getState();
  const [groupOrder, setGroupOrder] = useState<GroupOrder>(JSON.parse(groupSorter.order || '[]'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 8000);
  }, []);

  const saveGroupOrder = useCallback((newOrder) => {
    putEntry('groupSorter', 'order', JSON.stringify(newOrder));
    setGroupOrder(newOrder);
  }, [putEntry, setGroupOrder]);

  const handleDragAndDrop = useCallback(({ source, destination }) => {
    if (!destination) {
      return;
    }
    // TODO: figure out how to drag onto folders
    const items = Array.from(groupOrder);
    const [reorderedItem] = items.splice(source.index, 1);
    items.splice(destination.index, 0, reorderedItem);
    saveGroupOrder(items);
  }, [groupOrder, saveGroupOrder]);

  const groupList = useMemo(() => Object.values(associations?.groups || {})
    .filter(e => e?.group in groups)
    .sort(sortGroupsAlph), [associations, groups]);

  useEffect(() => {
    const newGroupOrder = JSON.parse(groupSorter.order || '[]');
    if (newGroupOrder.length) {
      setGroupOrder(newGroupOrder);
    }
  }, [groupSorter]);

  useEffect(() => {
    if (!groupOrder.length) {
      return;
    }
    // add groups to groupSorter.order if they're missing (as in, recently joined)
    let sortedGroups = [];
    for (const key in groupOrder) {
      if (typeof groupOrder[key] === 'string') {
        sortedGroups.push(groupOrder[key]);
      } else {
        sortedGroups = sortedGroups.concat(groupOrder[key]?.groups || []);
      }
    }
    const missingGroups = groupList.map(({ group }) => group).filter(g => !sortedGroups.includes(g));
    if (missingGroups.length) {
      saveGroupOrder(groupOrder.concat(missingGroups));
    }
  }, [groupList]);

  const joining = useGroupState(s =>
    _.omit(
      _.pickBy(s.pendingJoin || {}, req => req.app === 'groups' && req.progress != 'abort'),
      groupList.map(g => g.group)
    )
  );

  const invites = useInviteState(s => Object.values(s.invites?.['groups'] || {}).map(inv => resourceAsPath(inv?.resource)) || []);
  const pending = _.union(invites, Object.keys(joining)).filter(group =>
    !(group in (groups?.groups || {})) && !(group in (associations.groups || {}))
  );

  if (messages) {
    return <SidebarGroup {...props} workspace={{ type: 'messages' }} />;
  } else if (!groupList.length && loading) {
    return <Box width="100%" height="100%" display="flex" alignItems="center" justifyContent="center">
      <LoadingSpinner />
    </Box>;
  }

  if (changingSort) {
    const groupsToSort = groupOrder.length ? groupOrder : groupList.map(g => g.group);
    return <DragDropContext onDragEnd={handleDragAndDrop}>
      <SidebarGroupSorter groupOrder={groupsToSort} />
    </DragDropContext>;
  }

  return (
    <>
      <SidebarGroup {...props} workspace={{ type: 'home' }} />
      {groupOrder.length ? groupOrder.map((go) => {
        if (typeof go === 'string') {
          const g = associations.groups[go];
          if (!g) {
            return null;
          }

          return (
            <SidebarGroup
              key={g.group}
              {...props}
              workspace={{ type: 'group', group: g.group }}
              title={g.metadata.title}
            />
          );
        }

        // TODO: handle folders in groupOrder
        return null;
      }) : (
        groupList.map((g: any) => <SidebarGroup 
          key={g.group} {...props}
          workspace={{ type: 'group', group: g.group }}
          title={g.metadata.title}
        />)
      )}
      {pending.map(p => <PendingSidebarGroup key={p} path={p} />)}
    </>
  );
}