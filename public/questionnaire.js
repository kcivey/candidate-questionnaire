/* global jQuery, _ */
jQuery(function ($) {
    const tableTemplate = _.template($('#questionnaire-table-template').html());
    const maxHeight = 320;
    $.getJSON('questionnaire.json')
        .then(writeQuestionnaire)
        .catch(console.error);
    $('#table-container').on('click', '.expandable', toggleRow);

    function writeQuestionnaire(questionsAndAnswers) {
        const offices = Object.keys(questionsAndAnswers.answers);
        $('#contest-select')
            .append(
                offices.map(office => `<option>${office}</option>`)
            )
            .on('change', function () {
                const office = $(this).val();
                $('#table-container').html(tableTemplate({questionsAndAnswers, office}));
                const columns = Object.keys(questionsAndAnswers.answers[office]).length + 1;
                $('#questionnaire-table').css('maxWidth', (columns * 30) + 'rem');
                shrinkAllCells();
            })
            .trigger('change');
    }

    function toggleRow(evt) {
        evt.preventDefault();
        const expanded = !$(this)
            .find('.more')
            .length;
        const row = $(this).closest('tr');
        if (expanded) {
            shrinkRow(row);
        }
        else {
            expandRow(row);
        }
    }

    function expandRow(row) {
        row.find('.limited')
            .each(function () {
                $(this).height('auto')
                    .parent()
                    .find('.more')
                    .removeClass('more')
                    .addClass('less')
                    .find('a')
                    .text('less');
            });
    }

    function shrinkRow(row) {
        row.find('.limited')
            .each(function () {
                const height = $(this).height();
                if (height > maxHeight) {
                    $(this).parent()
                        .addClass('expandable')
                        .find('.more, .less')
                        .remove();
                    $(this).height(maxHeight)
                        .parent()
                        .append('<div class="more"><a href="#">more</a></div>');
                }
            });
    }

    function shrinkAllCells() {
        $('#questionnaire-table')
            .find('tbody tr')
            .each((i, el) => shrinkRow($(el)));
    }
});
