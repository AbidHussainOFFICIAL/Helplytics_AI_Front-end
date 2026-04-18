const { z } = require('zod');

const sendMessageSchema = z.object({
  text: z.string().min(1).max(500),
});

module.exports = {
  sendMessageSchema,
};