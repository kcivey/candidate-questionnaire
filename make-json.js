#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const util = require('util');
const cheerio = require('cheerio');
const glob = util.promisify(require('glob'));
const {escape} = require('entities');
const csvParse = util.promisify(require('csv-parse'));
const officeMap = {
    'Council Ward 2': /W2/,
    'Council Ward 4': /W4/,
    'Council Ward 7': /W7/,
    'Council Ward 8': /W8/,
    'Shadow Representative': /ShadowRep/,
};

main()
    .catch(function (err) {
        console.trace(err);
        process.exit(1);
    });

async function main() {
    const inputFiles = await glob(__dirname + '/*.html');
    const questionsAndAnswers = {};
    const organization = 'DC for Democracy';
    for (const inputFile of inputFiles) {
        const m = inputFile.match(/\/DC4DW\d(\w+)\.html$/);
        assert(m, `Unexpected filename format ${inputFile}`);
        const candidate = m[1].replace(/.*[a-z](?=[A-Z])/, '');
        const office = Object.keys(officeMap)
            .filter(k => officeMap[k].test(inputFile))[0];
        assert(office, `Can't get office for "${inputFile}`);
        if (!questionsAndAnswers[office]) {
            questionsAndAnswers[office] = {[organization]: {questions: [], answers: {}}};
        }
        const {questions, answers} = await processFile(inputFile);
        questionsAndAnswers[office][organization]['questions'] = questions;
        questionsAndAnswers[office][organization]['answers'][candidate] = answers;
    }
    if (!questionsAndAnswers['Council Ward 4'][organization]['answers']['Todd']) {
        questionsAndAnswers['Council Ward 4'][organization]['answers']['Todd'] = [];
    }
    questionsAndAnswers['Council Ward 4']['DC Working Families'] = await getWfpQuestionnaire();
    process.stdout.write(JSON.stringify(questionsAndAnswers));
}

function processFile(inputFile) {
    console.warn(inputFile);
    const $ = getCheerio(inputFile);
    const paragraphs = $('body')
        .children()
        .get()
        .map($);
    const questions = [];
    const answers = [];
    let questionNumber = 0;
    let skipQuestion = false;
    for (let p of paragraphs) {
        if (p.is('div')) {
            p = p.children();
        }
        if (p.is('h2')) {
            p = $('<p></p>').append(p.children());
        }
        if (p.is('ol') && p.hasClass('lst-kix_list_1-0') && p.children().length === 1) {
            const n = p.attr('start');
            p = p.find('ol li').prepend(n + '. ');
        }
        const div = $('<div></div>').append(p);
        let html = div.html()
            .replace(/ class="[^"]+"/g, '')
            .replace(/<p>\s*-\s*/g, '<p>')
            .replace(
                /https:\/\/www.google.com\/url\?q=([^&\s]+)[^"<>\s]*/,
                (m, m1) => decodeURIComponent(m1)
            );
        const text = div.text()
            .trim();
        let m;
        if ((m = text.match(/^(\d\d?)\. /))) {
            if ((m[1] === '6' || m[1] === '19') && questionNumber === m[1] - 2 && /W\d/.test(inputFile)) {
                questionNumber++;
            }
            assert.strictEqual(questionNumber + 1, +m[1], 'Question number mismatch');
            questionNumber = +m[1];
            if (text.match(/^\d\d?\. \(Ward 2/)) {
                html = html.replace(/\(Ward 2 challengers only\)\s+/, '');
                if (inputFile.match(/W4/)) {
                    skipQuestion = true;
                    continue;
                }
            }
            skipQuestion = false;
            questions.push(html.replace(/\b\d\d?\.\s+/, ''));
        }
        else if (/^(?!N\/A)[A-Z\W]+$/.test(text) || !questionNumber || !text) {
            // skip heads and intro and empty paragraphs
        }
        else {
            if (skipQuestion) {
                continue;
            }
            const i = questionNumber - 1;
            if (!answers[i]) {
                answers[i] = html;
            }
            else {
                answers[i] += '\n' + html;
            }
        }
    }
    return {questions, answers};
}

function getCheerio(inputFile) {
    const html = fs.readFileSync(inputFile, 'utf8')
        .replace(/<\/?span[^>]*>/g, '')
        .replace(/<br>\s*<br>/g, '</p><p>')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/ id="[^"]+"/g, '');
    return cheerio.load(html);
}

async function getWfpQuestionnaire() {
    const file = __dirname + '/wfp.tsv';
    const data = await csvParse(fs.readFileSync(file, 'utf8'), {columns: true, delimiter: '\t', quote: null});
    const questions = [];
    const answers = {};
    for (const row of data) {
        if (row['Question'] === 'Party' || row['Question'] === 'Seat') {
            continue;
        }
        for (const [column, value] of Object.entries(row)) {
            let html = '<p>' + escape(value) + '</p>';
            if (column === 'Question') {
                questions.push(html);
                continue;
            }
            const candidate = column.replace(/.+?(?=\b\w+$)/, '');
            if (!answers[candidate]) {
                answers[candidate] = [];
            }
            html = html.replace(/(https?:\/\/[^\s<>"]+)/, '<a href="$1">$1</a>');
            answers[candidate].push(/^Did not complete/.test(value) ? '' : html);
        }
    }
    return {questions, answers};
}
