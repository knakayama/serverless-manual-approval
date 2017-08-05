const AWS = require('aws-sdk');

class Worker {
  constructor(event, context, callback) {
    this.event = event;
    this.context = context;
    this.callback = callback;
    this.stepfunctions = new AWS.StepFunctions();
    this.ses = new AWS.SES({ region: 'us-east-1' });
  }

  getActivityTask() {
    const params = {
      activityArn: process.env.ACTIVITY_ARN,
    };
    return this.stepfunctions.getActivityTask(params).promise();
  }

  sendEmail(data) {
    const input = JSON.parse(data.input);
    const params = {
      Destination: {
        ToAddresses: [
          input.managerEmailAddress,
        ],
      },
      Message: {
        Subject: {
          Data: 'Your Approval Needed for Promotion!',
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: 'Hi!<br />' +
              `${input.employeeName} has been nominated for promotion!<br />` +
              'Can you please approve:<br />' +
              `${process.env.SERVICE_ENDPOINT}/succeed?taskToken=${encodeURIComponent(data.taskToken)}<br />` +
              'Or reject:<br />' +
              `${process.env.SERVICE_ENDPOINT}/fail?taskToken=${encodeURIComponent(data.taskToken)}`,
            Charset: 'UTF-8',
          },
        },
      },
      Source: input.managerEmailAddress,
      ReplyToAddresses: [
        input.managerEmailAddress,
      ],
    };
    return this.ses.sendEmail(params).promise();
  }

  start() {
    this.getActivityTask()
      .then((data) => {
        console.log(data);
        return this.sendEmail(data);
      })
      .then((data) => {
        console.log(data);
        this.callback(null, data);
      })
      .catch((err) => {
        console.log(err);
        this.callback(err);
      });
  }
}

module.exports.handler = (event, context, callback) => {
  new Worker(event, context, callback).start();
};
