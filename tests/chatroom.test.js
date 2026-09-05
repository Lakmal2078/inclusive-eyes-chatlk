import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ChatRoom } from '../src/components/ChatRoom.js';

test('ChatRoom React Component Suite', async (t) => {
  await t.test('renders empty state when message history is empty', () => {
    const html = renderToString(
      React.createElement(ChatRoom, {
        currentUserId: 'user-me',
        chatName: 'Amith Siriwardana',
        messages: []
      })
    );

    assert.ok(html.includes('No messages yet'), 'Should render empty state message');
    assert.ok(html.includes('Amith Siriwardana'), 'Should render chat title in header');
    assert.ok(html.includes('Type a message'), 'Should render message input placeholder');
    assert.ok(html.includes('id="chat-composer-form"'), 'Should render composer form');
  });

  await t.test('renders message history with outgoing and incoming bubbles', () => {
    const sampleMessages = [
      {
        id: 'msg-1',
        chat_id: 'chat-1',
        sender_id: 'user-other',
        text: 'Ayubowan! How are you doing today?',
        message_type: 'text',
        status: 'read',
        is_edited: 0,
        is_deleted: 0,
        is_pinned: 0,
        created_at: new Date().toISOString()
      },
      {
        id: 'msg-2',
        chat_id: 'chat-1',
        sender_id: 'user-me',
        text: 'I am doing great, working on ChatLK!',
        message_type: 'text',
        status: 'delivered',
        is_edited: 0,
        is_deleted: 0,
        is_pinned: 0,
        created_at: new Date().toISOString()
      }
    ];

    const html = renderToString(
      React.createElement(ChatRoom, {
        currentUserId: 'user-me',
        chatName: 'Kavindu Perera',
        messages: sampleMessages
      })
    );

    assert.ok(html.includes('Ayubowan! How are you doing today?'), 'Renders incoming message');
    assert.ok(html.includes('I am doing great, working on ChatLK!'), 'Renders outgoing message');
    assert.ok(html.includes('msg-row-msg-1'), 'Renders msg-1 element');
    assert.ok(html.includes('msg-row-msg-2'), 'Renders msg-2 element');
  });

  await t.test('renders pinned message banner when message is pinned', () => {
    const sampleMessages = [
      {
        id: 'msg-pinned',
        chat_id: 'chat-1',
        sender_id: 'user-other',
        text: 'Important meeting at 4 PM!',
        message_type: 'text',
        status: 'read',
        is_edited: 0,
        is_deleted: 0,
        is_pinned: 1,
        created_at: new Date().toISOString()
      }
    ];

    const html = renderToString(
      React.createElement(ChatRoom, {
        currentUserId: 'user-me',
        chatName: 'Team Project',
        messages: sampleMessages
      })
    );

    assert.ok(html.includes('pinned-messages-banner'), 'Should render pinned message banner');
    assert.ok(html.includes('Important meeting at 4 PM!'), 'Banner shows pinned message text');
  });

  await t.test('renders translations toggle when message has multilingual translations', () => {
    const sampleMessages = [
      {
        id: 'msg-translated',
        chat_id: 'chat-1',
        sender_id: 'user-other',
        text: 'Good morning everyone!',
        message_type: 'text',
        status: 'read',
        is_edited: 0,
        is_deleted: 0,
        is_pinned: 0,
        translations: JSON.stringify({
          si: 'සුබ උදෑසනක් වේවා!',
          ta: 'காலை வணக்கம்!'
        }),
        created_at: new Date().toISOString()
      }
    ];

    const html = renderToString(
      React.createElement(ChatRoom, {
        currentUserId: 'user-me',
        chatName: 'Multilingual Team',
        messages: sampleMessages
      })
    );

    assert.ok(html.includes('සිංහල'), 'Renders Sinhala translation button');
    assert.ok(html.includes('தமிழ்'), 'Renders Tamil translation button');
  });

  await t.test('renders smart reply suggestions', () => {
    const customReplies = ['Sure, will do!', 'හොඳයි', 'சரி'];
    const html = renderToString(
      React.createElement(ChatRoom, {
        currentUserId: 'user-me',
        chatName: 'Chat with Bot',
        messages: [],
        smartReplies: customReplies
      })
    );

    assert.ok(html.includes('smart-replies-bar'), 'Renders smart replies bar');
    assert.ok(html.includes('Sure, will do!'), 'Renders English reply');
    assert.ok(html.includes('හොඳයි'), 'Renders Sinhala reply');
    assert.ok(html.includes('சரி'), 'Renders Tamil reply');
  });
});
