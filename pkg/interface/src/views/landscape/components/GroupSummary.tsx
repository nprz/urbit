import React, { ReactNode } from "react";
import { Metadata } from "~/types";
import { Col, Row, Text } from "@tlon/indigo-react";
import { MetadataIcon } from "./MetadataIcon";

interface GroupSummaryProps {
  metadata: Metadata;
  memberCount: number;
  channelCount: number;
  children?: ReactNode;
}

export function GroupSummary(props: GroupSummaryProps) {
  const { channelCount, memberCount, metadata, children } = props;
  return (
    <Col maxWidth="500px" gapY="4">
      <Row gapX="2" width="100%">
        <MetadataIcon
          borderRadius="1"
          border="1"
          borderColor="lightGray"
          width="40px"
          height="40px"
          metadata={metadata}
          flexShrink="0"
        />
        <Col justifyContent="space-between" flexGrow="1" overflow="hidden">
          <Text
            fontSize="1"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
            overflow="hidden">{metadata.title}</Text>
          <Row gapX="2" justifyContent="space-between">
            <Text fontSize="1" gray>
              {memberCount} participants
            </Text>
            <Text fontSize="1" gray>
              {channelCount} channels
            </Text>
          </Row>
        </Col>
      </Row>
      <Row width="100%">
        {metadata.description && 
          <Text
            width="100%"
            fontSize="1"
            textOverflow="ellipsis"
            overflow="hidden">
            {metadata.description}
          </Text>
        }
      </Row>
      {children}
    </Col>
  );
}
