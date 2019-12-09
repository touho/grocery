import React from 'react'
const ConversationHistoryItem = ({ children, isReply }) => (
  <div
    className={`ConversationHistory__item ${
      isReply ? 'ConversationHistory__item--reply' : ''
    }`}
  >
    {children}
  </div>
)
const ConversationHistory = () => (
  <div className="ConversationHistory">
    <ConversationHistoryItem>
      <em>Hi there!</em>
    </ConversationHistoryItem>
    <ConversationHistoryItem>
      Press and hold the mic icon or hold the spacebar
    </ConversationHistoryItem>
    <ConversationHistoryItem>
      While holding, speak your items as a list to the mic:
    </ConversationHistoryItem>
    <ConversationHistoryItem isReply>
      ”apples, oranges, potato chips”
    </ConversationHistoryItem>
    <ConversationHistoryItem>
      The cart icon will add your items to your trolley
    </ConversationHistoryItem>
    <ConversationHistoryItem>
      <em>Enjoy shopping! 🛒</em>
    </ConversationHistoryItem>
  </div>
)

export default ConversationHistory
