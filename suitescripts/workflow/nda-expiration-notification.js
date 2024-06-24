/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */

define(['N/record', 'N/email'], function (record, email) {
    function onAction(context) {
      var customerSavedSearchId = '3024';
      var vendorSavedSearchId = '3023';
  
      var customerSearch = record.load({
        type: record.Type.SAVED_SEARCH,
        id: customerSavedSearchId,
      });
  
      var vendorSearch = record.load({
        type: record.Type.SAVED_SEARCH,
        id: vendorSavedSearchId,
      });
  
      // Perform any necessary operations on the customerSearch and vendorSearch records
      // For example, you can access field values and send email notifications for expired NDAs
  
      // Email notification example
      var recipients = ['email1@example.com', 'email2@example.com']; // Add the email addresses of the recipients
      var subject = 'Expired NDA Notification';
      var body = 'The NDA for a customer or vendor has expired.';
  
      email.send({
        author: -5, // NetSuite user ID of the email sender
        recipients: recipients,
        subject: subject,
        body: body,
      });
    }
  
    return {
      onAction: onAction,
    };
  });
  