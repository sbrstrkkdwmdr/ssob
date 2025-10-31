const categoryDescDict = {
    'general': 'General utility commands',
    'osu_profile': 'Show profile data',
    'osu_scores': 'Score lists and score parsing',
    'osu_map': 'Parse maps',
    'osu_track': 'Track your top scores',
    'osu_other': 'osu! commands that don\'t fit the other categories',
    'misc': 'Miscellaneous commands that don\'t fit in any category',
    'admin': 'Commands that require admin or bot owner status to use',
}

async function generate() {
    const clist = document.getElementById('clist');
    const navContainer = document.getElementById('category-nav');

    const grouped = {};

    cmds.forEach(cmd => {
        if (!grouped[cmd.category]) grouped[cmd.category] = [];
        grouped[cmd.category].push(cmd);
        grouped
    });

    const catOrder = [
        'general',
        'osu_profile',
        'osu_scores',
        'osu_map',
        'osu_track',
        'osu_other',
        'misc',
        'admin'
    ]
    for (const [category, cmds] of Object.entries(grouped).sort((a, b) => catOrder.indexOf(a[0]) - catOrder.indexOf(b[0]))) {
        const catHeadCon = document.createElement('div');
        catHeadCon.className = 'categoryHeader';
        catHeadCon.id = category;
        const categoryHeader = document.createElement('h2');
        categoryHeader.textContent = categoryName(category);
        categoryHeader.id = category;
        const categoryDesc = document.createElement('div');
        categoryDesc.textContent = categoryDescDict[category];
        catHeadCon.append(categoryHeader, categoryDesc);
        clist.appendChild(catHeadCon);

        const button = document.createElement('button');
        button.textContent = categoryName(category);
        button.onclick = () => {
            document.getElementById(category).scrollIntoView({ behavior: 'smooth' });
        };
        navContainer.appendChild(button);

        for (const cmd of cmds) {
            const container = document.createElement('div');
            container.id = cmd.name.toLowerCase();
            container.className = "accordion-item"

            const summary = document.createElement('div');
            summary.className = 'accordion-header'
            const summarySpan = document.createElement('div');
            summarySpan.className = 'summaryText';
            let usage = '';
            if ((cmd?.args ?? []).length > 0) {
                usage = ' <span class="cmdUsage">' + cmd.args.map(x =>
                    x.required ?
                        arrToAscii('<' + x.name + '>') :
                        '[' + x.name + ']'


                ).join(' ') + '</span>';
            }
            summarySpan.innerHTML = cmd.name /* + usage */;
            summary.appendChild(summarySpan);

            container.appendChild(summary);

            const body = document.createElement('div');
            body.className = 'accordion-body';

            if ((cmd?.aliases ?? []).length > 0) {
                const ali = document.createElement('div');
                ali.innerHTML = 'Aliases: ' + cmd.aliases.map(x => '<code>' + x + '</code>').join(' ');
                body.appendChild(ali);
            }

            const desc = document.createElement('p');
            desc.innerHTML = markdown(cmd.description);

            body.appendChild(desc);

            if ((cmd?.args ?? []).length > 0) {
                const args = document.createElement('div');
                const h = document.createElement('span');
                h.className = 'sectionTitle';
                h.innerText = 'Arguments: ';
                args.appendChild(h);
                for (const arg of cmd?.args ?? []) {
                    const argTitle = document.createElement('span');
                    argTitle.className = 'argName';
                    argTitle.innerText = arg.name;

                    const substr = document.createElement('span');
                    substr.className = 'argType';
                    substr.innerText = arg.type;

                    const argreq = document.createElement('span');
                    argreq.className = 'argReq';
                    if (arg.required) {
                        argreq.classList.add('required')
                        argreq.innerText = "Required";
                    } else {
                        argreq.classList.add('optional')
                        argreq.innerText = "Optional";
                    }

                    const argdesc = document.createElement('span');
                    argdesc.className = 'argDesc';
                    argdesc.innerHTML = markdown(arg.description);
                    if (arg.defaultValue && arg.defaultValue != 'null' && arg.defaultValue != 'N/A') {
                        argdesc.innerHTML += '<br>Defaults to ' + arg.defaultValue + '<br>';
                    }

                    const argctn = document.createElement('div');
                    argctn.className = "arg";
                    argctn.append(argTitle, substr, argreq, argdesc);
                    if (arg.format &&
                        (
                            (arg.format[0] == 'foo' && arg.format.length > 1) ||
                            arg.format[0] != 'foo'
                        )
                    ) {
                        argdesc.innerHTML += 'Formatted as: ' +
                            arg.format.map(x => '<code>' + x + '</code>').join(' ');
                    }
                    args.appendChild(argctn);
                }
                body.appendChild(args);
            }
            if ((cmd?.examples ?? []).length > 0) {
                const examples = document.createElement('div');
                const h = document.createElement('span');
                h.className = 'sectionTitle';
                h.innerText = 'Examples: ';
                examples.appendChild(h);
                for (const ex of cmd.examples) {
                    const exTitle = document.createElement('span');
                    exTitle.className = 'exName';
                    exTitle.innerText = ex.text.replace('PREFIXMSG', '');
                    const exDesc = document.createElement('span');
                    exDesc.className = 'exDesc';
                    exDesc.innerText = ex.description;
                    examples.append(exTitle, exDesc);
                }
                body.appendChild(examples);
            }
            container.append(summary, body);
            clist.appendChild(container);
        }
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