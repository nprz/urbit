import React, {
  useState
} from 'react';
import { Button, Text, Box, Row, BaseTextArea } from '@tlon/indigo-react';
import tokenizeMessage from '~/logic/lib/tokenizeMessage';
import { createPost } from '~/logic/api/graph';


export function PostInput(props) {
  const { api, graphResource, index, submitCallback } = props;
  const [disabled, setDisabled] = useState(false);
  const [postContent, setPostContent] = useState('');

  const sendPost = () => {
    if (!graphResource) {
      console.error("graphResource is undefined, cannot post");
      return;
    }

    setDisabled(true);
    const post = createPost(tokenizeMessage(postContent), index || '');

    api.graph.addPost(
      graphResource.ship,
      graphResource.name,
      post
    ).then(() => {
      setDisabled(false);
      setPostContent('');

      if (submitCallback) {
        submitCallback();
      }
    });
  };

  return (
    <Box
      width="100%"
      height="96px"
      borderRadius="2"
      border={1}
      borderColor="lightGray">
      <BaseTextArea
        p={2}
        backgroundColor="transparent"
        width="100%"
        color="black"
        fontSize={1}
        height="62px"
        lineNumber={3}
        style={{
          resize: 'none',
        }}
        placeholder="What's on your mind?"
        spellCheck="false"
        value={postContent}
        onChange={e => setPostContent(e.target.value)}
      />
      <Row
        borderTop={1}
        borderTopColor="lightGray"
        width="100%"
        height="32px"
        pl="2"
        display="flex"
        justifyContent="space-between"
        alignItems="center">
        <Box></Box>
        <Button
          pl="2"
          pr="2"
          height="31px"
          flexShrink={0}
          backgroundColor="transparent"
          border="none"
          disabled={!postContent || disabled}
          onClick={sendPost}>
          Post
        </Button>
      </Row>
    </Box>
  );
}


