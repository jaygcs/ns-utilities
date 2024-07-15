/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record'], function (search, record) {
  function updateFinancialGrades() {
    var customerSearch = search.create({
      type: search.Type.CUSTOMER,
      columns: ['internalid'],
      filters: [
        ['custentity_gcs_cust_failure_score', 'isnotempty', ''],
        'OR',
        ['custentity_gcs_cust_delinquency_score', 'isnotempty', ''],
        'OR',
        ['custentity_gcs_cust_paydex', 'isnotempty', '']
      ]
    });

    var customerCount = 0;
    customerSearch.run().each(function (result) {
      var customerId = result.getValue({ name: 'internalid' });
      var customerRecord = record.load({
        type: record.Type.CUSTOMER,
        id: customerId,
        isDynamic: true
      });

      // Calculate financial grade
      var failureScore = customerRecord.getValue({ fieldId: 'custentity_gcs_cust_failure_score' });
      var delinquencyScore = customerRecord.getValue({ fieldId: 'custentity_gcs_cust_delinquency_score' });
      var paydexScore = customerRecord.getValue({ fieldId: 'custentity_gcs_cust_paydex' });

      // var average = 0;
      // var totalFieldsWithData = 0;

      var scores = [failureScore, delinquencyScore, paydexScore]; 
      var validScores = scores.filter(function(score) { 
        return score !== null && score !== undefined && score !== '' && !isNaN(score); 
      }); 
      var totalFieldsWithData = validScores.reduce(function(sum, score) {
         return sum + parseFloat(score); }, 0); 
      var average = validScores.length > 1 ? totalFieldsWithData / validScores.length : 0; 

      // if (!isNaN(failureScore)) {
      //   average += failureScore;
      //   totalFieldsWithData++;
      // }

      // if (!isNaN(delinquencyScore)) {
      //   average += delinquencyScore;
      //   totalFieldsWithData++;
      // }

      // if (!isNaN(paydexScore)) {
      //   average += paydexScore;
      //   totalFieldsWithData++;
      // }

      // if (totalFieldsWithData > 0) {
      //   average /= totalFieldsWithData;
      // }

      var grade = '';

      if (average >= 0 && average <= 20) {
        grade = 'F';
      } else if (average > 20 && average <= 35) {
        grade = 'D';
      } else if (average > 35 && average <= 60) {
        grade = 'C';
      } else if (average > 60 && average <= 80) {
        grade = 'B';
      } else if (average > 80) {
        grade = 'A';
      }

      // Update the financial grade on the customer record
      customerRecord.setValue({ fieldId: 'custentity_gcs_relation_financial_grade', value: grade });
      customerRecord.save();

      customerCount++;
      return true;
    });

    log.audit('Updated Financial Grades', 'Total Vendor Records Updated: ' + customerCount);
  }

  return {
    execute: updateFinancialGrades
  };
});
