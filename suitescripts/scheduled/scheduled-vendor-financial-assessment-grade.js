/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @NModuleScope SameAccount
 */
define(['N/search', 'N/record'], function (search, record) {
  function updateFinancialGrades() {
    var vendorSearch = search.create({
      type: search.Type.VENDOR,
      columns: ['internalid'],
      filters: [
        ['custentity_gcs_cust_failure_score', 'isnotempty', ''],
        'OR',
        ['custentity_gcs_cust_delinquency_score', 'isnotempty', ''],
        'OR',
        ['custentity_gcs_cust_paydex', 'isnotempty', '']
      ]
    });

    var vendorCount = 0;
    vendorSearch.run().each(function (result) {
      var vendorId = result.getValue({ name: 'internalid' });
      var vendorRecord = record.load({
        type: record.Type.VENDOR,
        id: vendorId,
        isDynamic: true
      });

      // Calculate financial grade
      var failureScore = vendorRecord.getValue({ fieldId: 'custentity_gcs_cust_failure_score' });
      var delinquencyScore = vendorRecord.getValue({ fieldId: 'custentity_gcs_cust_delinquency_score' });
      var paydexScore = vendorRecord.getValue({ fieldId: 'custentity_gcs_cust_paydex' });

      var average = 0;
      var totalFieldsWithData = 0;

      if (!isNaN(failureScore)) {
        average += failureScore;
        totalFieldsWithData++;
      }

      if (!isNaN(delinquencyScore)) {
        average += delinquencyScore;
        totalFieldsWithData++;
      }

      if (!isNaN(paydexScore)) {
        average += paydexScore;
        totalFieldsWithData++;
      }

      if (totalFieldsWithData > 0) {
        average /= totalFieldsWithData;
      }

      var grade = '';

      if (average >= 0 && average <= 20) {
        grade = 'F';
      } else if (average >= 21 && average <= 35) {
        grade = 'D';
      } else if (average >= 36 && average <= 60) {
        grade = 'C';
      } else if (average >= 61 && average <= 80) {
        grade = 'B';
      } else if (average > 80) {
        grade = 'A';
      }

      // Update the financial grade on the vendor record
      vendorRecord.setValue({ fieldId: 'custentity_gcs_relation_financial_grade', value: grade });
      vendorRecord.save();

      vendorCount++;
      return true;
    });

    log.audit('Updated Financial Grades', 'Total Vendor Records Updated: ' + vendorCount);
  }

  return {
    execute: updateFinancialGrades
  };
});
