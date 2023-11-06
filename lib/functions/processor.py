import base64

def handler(event, context):
    output = []

    for record in event['records']:
        payload = base64.b64decode(record['data'])
        output_record = {
            'recordId': record['recordId'],
            'result': 'Ok',
            'data': base64.b64encode(payload+b'\n').decode('utf-8')
        }
        output.append(output_record)

    print('Successfully processed {} records.'.format(len(event['records'])))
    return {'records': output}
