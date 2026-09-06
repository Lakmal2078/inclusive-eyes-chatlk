import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Status } from '../src/components/Status.js';
import { Calls } from '../src/components/Calls.js';

test('Status renders WhatsApp-style updates', () => {
  const html = renderToString(React.createElement(Status, {
    items: [{ id: 'status-1', name: 'Nadee', time: '10:30 AM', preview: 'Good morning' }]
  }));

  assert.ok(html.includes('Status'));
  assert.ok(html.includes('My status'));
  assert.ok(html.includes('Nadee'));
  assert.ok(html.includes('Good morning'));
});

test('Calls renders voice and video entry points', () => {
  const html = renderToString(React.createElement(Calls, {
    items: [{ id: 'call-1', name: 'Kavindu', time: 'Yesterday', direction: 'incoming', video: true }]
  }));

  assert.ok(html.includes('Calls'));
  assert.ok(html.includes('Voice call'));
  assert.ok(html.includes('Video call'));
  assert.ok(html.includes('Kavindu'));
});