const ckeys = [
    'fixed',
    'changed',
    'added',
    'removed',
    'deprecated',
    'refactor',
    'info',
]

/**
 * 
 * @param {string} input 
 */
function parseChangelog(input) {
    const versions = [];
    const backval = input.split('## [');
    backval.shift();
    for (const value of backval) {
        const committemp = value.split('[commit](')[1].split(')')[0];
        const commitURL = (/^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:[0-9]{1,5})?(\/[^\s]*)?$/g.test(committemp) ?
            committemp : 'https://github.com/sbrstrkkdwmdr/ssob').replace('commit', 'tree').replace('sbrbot', 'ssob');

        const commit = commitURL.includes('tree/') ?
            commitURL.split('tree/')[1].slice(0, 6)
            : 'NULL'

        const cver = {
            name: value.split(']')[0].trim(),
            date: value.split('] -')[1].split('\n')[0].trim(),
            commit,
            commitURL,
            fixed: [],
            changed: [],
            added: [],
            removed: [],
            deprecated: [],
            info: [],
            refactor: [],
        }
        const changesTxt = value.includes('</br>') ? value.split('</br>')[1] :
            value.split('\n').slice(3).join('\n');
        const changesList =
            changesTxt ?
                changesTxt.split('\n')
                    .map(x => x.trim())
                    .filter(x => x.length > 2) : [];
        let key = 'info';
        for (const change of changesList) {
            if (change.startsWith('###')) {
                key = change.replaceAll('###', '').trim().toLowerCase();
                if (!ckeys.some(x => x == key)) {
                    key = 'info'
                }
            } else {
                console.log(change)
                cver[key].push(change.replace('-', '').trim())
            }
        }
        versions.push(cver);
    }
    return versions;
}

async function generate(str) {
    const parsed = parseChangelog(str);
    const clist = document.getElementById('clist');
    for (const version of parsed) {
        const container = document.createElement('div');
        container.id = version.name.toLowerCase();
        container.className = "accordion-item"

        const summary = document.createElement('div');
        summary.className = 'accordion-header'
        const summarySpan = document.createElement('div');
        summarySpan.className = 'summaryText';
        summarySpan.innerHTML = version.name + ' <span class="cmdUsage">(' + version.date + ')</span>';
        summary.appendChild(summarySpan);

        container.appendChild(summary);

        const body = document.createElement('div');
        body.className = 'accordion-body';

        const desc = document.createElement('p');
        desc.innerHTML = markdown('Final commit: [' + version.commit + '](' + version.commitURL + ')');

        body.appendChild(desc);
        let haschanges = false;
        for (key of ckeys) {
            const list = version[key];
            if (list?.length > 0) {
                haschanges = true;
                const heading =
                    document.createElement('div');
                heading.className = 'clogSectionTitle ' + key;
                heading.innerText = toCapital(key);

                const text = document.createElement('div');
                text.className = 'argDesc';
                text.innerHTML = list.map(x => '<li>' + markdown(x)).join('</li>');
                body.append(heading, text);
            }
        }
        if (!haschanges) {
            const heading =
                document.createElement('div');
            heading.className = 'argName info';
            heading.innerText = toCapital('info');

            const text = document.createElement('div');
            text.className = 'argDesc';
            text.innerHTML = 'No changes recorded'
            body.append(heading, text);
        }

        container.append(summary, body);
        clist.appendChild(container);
    }
}

function getAll() {
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            const body = header.nextElementSibling;
            const isOpen = body.classList.contains('open');

            if (isOpen) {
                body.style.maxHeight = null;
                body.classList.remove('open');
            } else {
                body.style.maxHeight = body.scrollHeight + 'px';
                body.classList.add('open');
            }

            document.querySelectorAll('.accordion-body').forEach(other => {
                if (other !== body) {
                    other.style.maxHeight = null;
                    other.classList.remove('open');
                }
            });

        });
    });
}

function arrToAscii(string) {
    return string.replaceAll('<', '&lt').replaceAll('>', '&gt');
}

function markdownURLtoHTML(str) {
    if (
        str.includes('[') &&
        str.includes(']') &&
        str.includes('(') &&
        str.includes(')') &&
        str.includes('](') ||
        str.includes('] (')
    ) {
        const int = str.split('[')[0]
        const fin = str.split(')')[1]
        const namae = str.split('[')[1].split(']')[0]
        const url = str.split('(')[1].split(')')[0]
        return `${int} <a class="highlightLink" href=${encodeURI(url)}>${namae}</a> ${fin}`
    }
    return str;
}

function scrollToCategory(id) {
    const section = document.getElementById(id);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

/**
 * @returns string with the first letter capitalised
 */
function toCapital(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function categoryName(str) {
    return str.includes('osu_') ?
        'osu! ' + toCapital(str.split('_')[1]) :
        toCapital(str);
}