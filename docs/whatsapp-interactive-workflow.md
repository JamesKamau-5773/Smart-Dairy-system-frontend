# WhatsApp Interactive Workflow

This document turns the WhatsApp Cloud API recommendation into a concrete backend implementation guide for Jivu Smart Dairy.

## Goal

Farmhands should tap native WhatsApp UI elements instead of typing commands or replying with numbers.

The backend must own:

- the conversation state
- the command router
- the persistence of each farm action
- the outbound Meta Cloud API requests

The visible button or list label is presentation only. The stable option `id` is the real command.

## Recommended Command Model

Use stable ids that never change even if labels are translated or renamed.

Suggested ids:

- `open_menu`
- `log_milk`
- `log_feed`
- `view_herd`
- `view_reports`
- `confirm_yes`
- `confirm_no`
- `shift_morning`
- `shift_afternoon`
- `shift_evening`

## Conversation State

Track the current step for each WhatsApp user plus tenant/farm scope.

Suggested state fields:

- `wa_id`
- `tenant_id`
- `farm_id`
- `conversation_id`
- `current_flow`
- `current_step`
- `expected_command_ids`
- `payload_context`
- `last_message_id`
- `updated_at`

The state store can be Redis, a database table, or a durable queue-backed session store. The important part is that it survives webhook retries and process restarts.

## Flask Webhook Shape

### GET verification

Meta will call the webhook with a challenge during setup. The backend should return the challenge when the verify token matches.

Pseudo-code:

```python
@app.get("/api/whatsapp/webhook")
def verify_webhook():
    mode = request.args.get("hub.mode")
    token = request.args.get("hub.verify_token")
    challenge = request.args.get("hub.challenge")

    if mode == "subscribe" and token == VERIFY_TOKEN:
        return challenge, 200

    return "Forbidden", 403
```

### POST inbound events

The backend should:

1. validate the request signature if configured
2. parse the webhook entry payload
3. extract the message id
4. ignore duplicate message ids
5. resolve the WhatsApp user id to tenant/farm scope
6. route the stable command id
7. send the next prompt or persist the final action

Pseudo-code:

```python
@app.post("/api/whatsapp/webhook")
def receive_webhook():
    payload = request.get_json(force=True)

    for entry in payload.get("entry", []):
        for change in entry.get("changes", []):
            value = change.get("value", {})
            for message in value.get("messages", []):
                message_id = message.get("id")
                if message_already_processed(message_id):
                    continue

                wa_id = message.get("from")
                interactive = message.get("interactive", {})
                command_id = extract_command_id(message, interactive)

                context = load_conversation_state(wa_id)
                route_command(wa_id, command_id, message, context)

    return "OK", 200
```

## Payload Extraction Rules

Handle these cases:

- text message: `message["text"]["body"]`
- list selection: `message["interactive"]["list_reply"]["id"]`
- button selection: `message["interactive"]["button_reply"]["id"]`

Do not use the displayed title as the command. It can be localized or edited later.

Example helper:

```python
def extract_command_id(message, interactive):
    if "interactive" in message:
        list_reply = interactive.get("list_reply")
        if list_reply:
            return list_reply.get("id")

        button_reply = interactive.get("button_reply")
        if button_reply:
            return button_reply.get("id")

    text = message.get("text", {}).get("body", "").strip().lower()
    if text == "menu":
        return "open_menu"
    return text
```

## Interactive List Payload

Use a list for the main navigation.

Example payload:

```json
{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "2547xxxxxxxx",
  "type": "interactive",
  "interactive": {
    "type": "list",
    "body": {
      "text": "Choose what you want to do"
    },
    "action": {
      "button": "Menu",
      "sections": [
        {
          "title": "Farm Actions",
          "rows": [
            {
              "id": "log_milk",
              "title": "Log Milk",
              "description": "Record yield for a cow"
            },
            {
              "id": "log_feed",
              "title": "Log Feed",
              "description": "Record feed usage or mixing"
            },
            {
              "id": "view_herd",
              "title": "View Herd",
              "description": "See cows and herd status"
            },
            {
              "id": "view_reports",
              "title": "Reports",
              "description": "Open dashboards and summaries"
            }
          ]
        }
      ]
    }
  }
}
```

## Quick Reply Buttons

Use buttons for small, high-confidence choices.

Examples:

### Confirm / Cancel

```json
{
  "messaging_product": "whatsapp",
  "to": "2547xxxxxxxx",
  "type": "interactive",
  "interactive": {
    "type": "button",
    "body": {
      "text": "Save this milk entry?"
    },
    "action": {
      "buttons": [
        {
          "type": "reply",
          "reply": {
            "id": "confirm_yes",
            "title": "Confirm"
          }
        },
        {
          "type": "reply",
          "reply": {
            "id": "confirm_no",
            "title": "Cancel"
          }
        }
      ]
    }
  }
}
```

### Morning / Afternoon / Evening

```json
{
  "messaging_product": "whatsapp",
  "to": "2547xxxxxxxx",
  "type": "interactive",
  "interactive": {
    "type": "button",
    "body": {
      "text": "Select the milking session"
    },
    "action": {
      "buttons": [
        {
          "type": "reply",
          "reply": {
            "id": "shift_morning",
            "title": "Morning"
          }
        },
        {
          "type": "reply",
          "reply": {
            "id": "shift_afternoon",
            "title": "Afternoon"
          }
        },
        {
          "type": "reply",
          "reply": {
            "id": "shift_evening",
            "title": "Evening"
          }
        }
      ]
    }
  }
}
```

## Suggested Flow For Log Milk

1. User taps `Log Milk` in the main list.
2. Backend stores `current_flow = log_milk`.
3. Backend asks for cow selection or cow tag.
4. User picks a cow or types a valid identifier.
5. Backend asks for session with buttons.
6. User taps the session button.
7. Backend asks for liters.
8. User sends liters.
9. Backend validates and persists the milk log.
10. Backend sends confirmation and clears the conversation state.

## What The Backend Must Do For This To Work Reliably

- normalize every interactive selection to a stable command id
- persist conversation state across retries and process restarts
- make every command handler idempotent
- deduplicate webhook deliveries by message id
- validate each tenant/farm match before writing any data
- keep menu ids and follow-up ids stable over time
- separate WhatsApp transport code from domain workflows
- record an audit trail for every chat-driven action
- return a clear fallback if the user sends plain text instead of tapping a button

## Recommended Backend Module Split

- `whatsapp_webhook.py` or `whatsapp_webhook.py` blueprint: HTTP verification and inbound parsing
- `whatsapp_message_service.py`: outbound list/button message builders
- `whatsapp_command_router.py`: maps stable ids to use-case handlers
- `whatsapp_conversation_store.py`: reads and writes state
- `milk_service.py`, `feed_service.py`, `herd_service.py`: domain actions

Keeping these separate preserves SRP and makes the transport layer replaceable if you later move beyond WhatsApp.