def handler(event, context):
    print(event)
    text = event['text']
    return text