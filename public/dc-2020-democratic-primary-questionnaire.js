/* global jQuery, _ */
jQuery(function ($) {
    const checkboxesTemplate = _.template($('#checkboxes-template').html());
    const tableTemplate = _.template($('#questionnaire-table-template').html());
    const maxHeight = 320;
    $.getJSON('dc-2020-democratic-primary-questionnaire.json')
        .then(writeQuestionnaire)
        .catch(console.error);
    $('#table-container').on('click', '.expandable', toggleRow);

    function writeQuestionnaire(questionsAndAnswersByOffice) {
        const offices = Object.keys(questionsAndAnswersByOffice);
        $('#contest-select')
            .append(
                offices.map(office => `<option>${office}</option>`)
            )
            .on('change', function () {
                const office = $(this).val();
                const questionsAndAnswersByOrg = questionsAndAnswersByOffice[office];
                const firstOrg = Object.keys(questionsAndAnswersByOrg)[0];
                const candidates = shuffleArray(Object.keys(questionsAndAnswersByOrg[firstOrg].answers));
                $('#checkbox-container').html(checkboxesTemplate({candidates}));
                const tableContainer = $('#table-container');
                tableContainer.height($(window).height() - 60)
                    .html(tableTemplate({candidates, questionsAndAnswersByOrg}));
                const columns = candidates.length + 1;
                $('#questionnaire-table').css({
                    minWidth: (columns * 15) + 'rem',
                    maxWidth: (columns * 30) + 'rem',
                });
                $('#questionnaire-table-head').width($('#questionnaire-table').width());
                shrinkAllCells();
            })
            .trigger('change');
        $('#checkbox-container')
            .on('click', 'input', function () {
                const checkboxes = $('#checkbox-container').find('input');
                const numberChecked = checkboxes.filter(':checked').length;
                const showAll = !numberChecked;
                const columnsShown = showAll ? checkboxes.length : numberChecked;
                checkboxes.each(function () {
                    const column = +$(this).val();
                    $('th.org-head').attr('colspan', columnsShown);
                    $(`#questionnaire-table tr > :nth-child(${column})`).toggle(showAll || $(this).is(':checked'));
                });
                shrinkAllCells();
            });
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
                $(this).height('auto')
                    .parent()
                    .removeClass('expandable')
                    .find('.more, .less')
                    .remove();
                const height = $(this).height();
                if (height > maxHeight) {
                    $(this).height(maxHeight)
                        .parent()
                        .addClass('expandable')
                        .append('<div class="more"><a href="#">more</a></div>');
                }
            });
    }

    function shrinkAllCells() {
        $('#questionnaire-table')
            .find('.question-row')
            .each((i, el) => shrinkRow($(el)));
    }

    function shuffleArray(originalArray) {
        const array = [...originalArray];
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
});
