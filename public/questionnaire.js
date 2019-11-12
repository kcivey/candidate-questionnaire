/* global jQuery, _ */
jQuery(function ($) {
    const checkboxesTemplate = _.template($('#checkboxes-template').html());
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
                const answersByCandidate = questionsAndAnswers.answers[office];
                const candidates = shuffleArray(Object.keys(answersByCandidate));
                $('#checkbox-container').html(checkboxesTemplate({candidates}));
                $('#table-container').html(tableTemplate({
                    candidates,
                    questions: questionsAndAnswers.questions,
                    answersByCandidate,
                }));
                const columns = Object.keys(questionsAndAnswers.answers[office]).length + 1;
                $('#questionnaire-table').css({
                    minWidth: (columns * 15) + 'rem',
                    maxWidth: (columns * 30) + 'rem',
                });
                shrinkAllCells();
            })
            .trigger('change');
        $('#checkbox-container')
            .on('click', 'input', function () {
                const checkboxes = $('#checkbox-container').find('input');
                const showAll = checkboxes.filter(':checked').length === 0;
                checkboxes.each(function () {
                    const column = +$(this).val();
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
            .find('tbody tr')
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
