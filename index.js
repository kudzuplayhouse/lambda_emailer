var aws = require('aws-sdk');

var ses = new aws.SES();
var s3 = new aws.S3();

var sendEmail = function(params, context) {

    var lambdaResponse = {
      "statusCode": 200,
      "headers": {}
    };

    ses.sendEmail(params, function (err, data) {
        if (err) {
            console.log(err, err.stack);
            lambdaResponse.statusCode = 500;
            lambdaResponse.body = 'Internal Error: The email could not be sent - ' + err.stack;
            context.fail(lambdaResponse);
        } else {
            console.log(data);           // successful response
            lambdaResponse.body = 'The email was successfully sent!';
            context.succeed(lambdaResponse);
        }
    });
};

var buildEmail = function(template, context, event, config) {
    var params = {
        Destination: {
            ToAddresses: [
                'admin@kudzuplayers.com'
            ]
        },
        Message: {
            Subject: {
                Data: 'Test Email',
                Charset: 'UTF-8'
            }
        },
        Source: 'admin@kudzuplayers.com',
        ReplyToAddresses: [
            'Daniel Mullins <admin@kudzuplayers.com>'
        ]
    };

    params.Message.Body = {
        Html: {
            Data: '',
            Charset: 'UTF-8'
        }
    };

    var mark = require('markup-js');

    params.Message.Subject.Data = mark(config.defaultSubject, event.data);
    params.Message.Body.Html.Data = mark(template, event.data);

    sendEmail(params, context);
};

exports.handler = function (event, context) {

    var config = {
        "templateBucket" : "kudzuplayers.com-email-templates",
        "templateKey" : "Templates/Template.html",
        "targetAddress" : "admin@kudzuplayers.com",
        "fromAddress": "Kudzu Playhouse <admin@kudzuplayers.com>",
        "defaultSubject" : "Email From {{form_name}}"
    };

    s3.getObject({
        Bucket: config.templateBucket,
        Key: event.data.form_name + '.html'
    }, function(err, data) {
        if(err) {
            console.log('Error fetching custom template');
            s3.getObject({
                Bucket: config.templateBucket,
                Key: 'default.html'
            }, function(err, data) {
                if(err) {
                    console.log('Error fetching default template');
                    context.fail({
                        "statusCode":"500",
                        "headers":{},
                        "body":"Template failure, exiting"
                    });
                } else {
                    buildEmail(data.Body.toString(), context, event, config);
                }
            });
        } else {
             buildEmail(data.Body.toString(), context, event, config);
        }

    });
};
