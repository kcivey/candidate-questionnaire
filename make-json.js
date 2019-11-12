#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const util = require('util');
const cheerio = require('cheerio');
const glob = util.promisify(require('glob'));
const csvParse = util.promisify(require('csv-parse'));
const officeMap = {
    'Council Ward 2': /W2/,
    'Council Ward 4': /W4/,
};

main()
    .catch(function (err) {
        console.trace(err);
        process.exit(1);
    });

async function main() {
    const inputFiles = await glob(__dirname + '/*.html');
    const questionsAndAnswers = {questions: [], answers: []};
    const answersByOffice = {};
    for (const inputFile of inputFiles) {
        const m = inputFile.match(/\/DC4DW\d(\w+)\.html$/);
        assert(m, `Unexpected filename format ${inputFile}`);
        const candidate = m[1].replace(/.*[a-z](?=[A-Z])/, '');
        const office = Object.keys(officeMap)
            .filter(k => officeMap[k].test(inputFile))[0];
        assert(office, `Can't get office for "${inputFile}`);
        if (!answersByOffice[office]) {
            answersByOffice[office] = {};
        }
        const {questions, answers} = await processFile(inputFile);
        assert.strictEqual(questions.length, 20, 'Wrong number of questions');
        assert.strictEqual(answers.length, 20, 'Wrong number of answers');
        questionsAndAnswers['questions'] = questions;
        answersByOffice[office][candidate] = answers;
    }
    if (!answersByOffice['Council Ward 4']['Todd']) {
        answersByOffice['Council Ward 4']['Todd'] = [];
    }
    questionsAndAnswers['answers'] = answersByOffice;
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
        const html = div.html()
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
            assert.strictEqual(questionNumber + 1, +m[1], 'Question number mismatch');
            questionNumber = +m[1];
            questions[questionNumber - 1] = html.replace(/\b\d\d?\.\s+/, '');
        }
        else if (/^(?!N\/A)[A-Z\W]+$/.test(text) || !questionNumber || !text) {
            // skip heads and intro and empty paragraphs
        }
        else {
            const i = questionNumber - 1;
            if (!answers[i]) {
                answers.push(html);
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
    console.warn(data);
}
