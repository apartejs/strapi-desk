import conversation from './conversation/schema.json';
import message from './message/schema.json';
import note from './note/schema.json';
import savedReply from './saved-reply/schema.json';

export default {
  conversation: { schema: conversation },
  message: { schema: message },
  note: { schema: note },
  'saved-reply': { schema: savedReply },
};
