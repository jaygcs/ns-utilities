/**
 * @NModuleScope public
 * @NApiVersion 2.x
 */
define([ 'N/format' ], function(format) {

    return {

        number: function(n) {

            n = n.toFixed(2);

            return format.format({
                value: n,
                type: format.Type.FLOAT,
                precision: 2
            });
        },

        money: function(n) {
            
            var s = '$' + this.number(n);

            if(n < 0) {

                s = '(' + s + ')';
            }
            
            return s;
        },

        lb2mt: function(n) {
            return Number(n / 2204.6);
        }
    }
});