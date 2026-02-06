const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const GITHUB_ICON_URL = "https://github.githubassets.com/favicons/favicon.svg";

async function fetchTrending() {
    try {
        const { data } = await axios.get('https://github.com/trending', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
            },
            timeout: 10000 // 设置 10 秒超时
        });
        const $ = cheerio.load(data);
        const repos = [];

        $('article.Box-row').each((i, el) => {
            const titleTag = $(el).find('h2.h3 a');
            const title = titleTag.text().trim().replace(/\s+/g, '');
            const link = 'https://github.com' + titleTag.attr('href');
            const desc = $(el).find('p.my-1').text().trim() || 'No description provided.';
            const lang = $(el).find('[itemprop="programmingLanguage"]').text().trim() || 'Other';

            // 提取今日 Star 数并转换为数字
            const starsTodayText = $(el).find('span.d-inline-block.float-sm-right').text().trim();
            const starCount = parseInt(starsTodayText.replace(/,/g, '').match(/\d+/) || 0);

            repos.push({ title, link, desc, lang, starsToday: starsTodayText, starCount });
        });

        // 【修改点1】按 Star 数从高到低排序
        return repos.sort((a, b) => b.starCount - a.starCount);
    } catch (error) {
        console.error('抓取失败:', error);
        return [];
    }
}

function generateHTML(repos) {
    const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

    // 【修改点2】统计每种语言的数量
    const langCounts = { "ALL": repos.length };
    repos.forEach(repo => {
        langCounts[repo.lang] = (langCounts[repo.lang] || 0) + 1;
    });

    // 提取并按字母排序语言（排除 ALL）
    const sortedLangs = Object.keys(langCounts)
        .filter(l => l !== "ALL")
        .sort((a, b) => a.localeCompare(b));

    const finalLangList = ["ALL", ...sortedLangs];

    // 【修改点3】生成带数字角标的筛选按钮
    const filterButtons = finalLangList.map(lang => `
        <button
            onclick="filterLang('${lang}')"
            data-nav-lang="${lang}"
            class="filter-btn relative px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border flex items-center bg-white text-slate-600 border-slate-200 hover:border-slate-300"
        >
            ${lang}
            <span class="ml-1.5 px-1.5 py-0.5 text-[10px] rounded-full bg-slate-100 text-slate-400 group-active:bg-slate-200">
                ${langCounts[lang]}
            </span>
        </button>
    `).join('');

    const cards = repos.map(repo => {
        const langKey = repo.lang.toLowerCase().replace('typescript', 'ts').replace('shell', 'bash').replace('javascript', 'js');
        const langIcon = `https://skillicons.dev/icons?i=${langKey}`;

        return `
        <div class="repo-card group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between" data-lang="${repo.lang}">
            <div>
                <div class="flex justify-between items-start mb-4">
                    <span class="inline-flex items-center text-xs font-bold px-2.5 py-1 bg-slate-50 text-slate-600 rounded-lg border border-slate-100">
                        <img src="${langIcon}" class="w-3.5 h-3.5 mr-1.5 rounded-sm" alt="${repo.lang}" onerror="this.style.display='none'">
                        ${repo.lang}
                    </span>
                    <span class="text-xs text-amber-500 font-medium flex items-center">
                        <svg class="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                        ${repo.starsToday}
                    </span>
                </div>
                <a href="${repo.link}" target="_blank" class="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors flex items-center mb-3">
                    <img src="${GITHUB_ICON_URL}" class="w-5 h-5 mr-2.5 flex-shrink-0" alt="GitHub">
                    <span class="truncate">${repo.title}</span>
                </a>
                <p class="text-slate-500 text-sm line-clamp-3 leading-relaxed">
                    ${repo.desc}
                </p>
            </div>
            <div class="mt-6 pt-4 border-t border-slate-50 flex justify-end">
                <a href="${repo.link}" target="_blank" class="inline-flex items-center text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors">
                    查看项目 <span class="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                </a>
            </div>
        </div>
        `;
    }).join('');

    const html = `
    <!DOCTYPE html>
    <html lang="zh">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Github Trending Daily</title>
        <link rel="icon" href="${GITHUB_ICON_URL}" type="image/svg+xml">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
            body { font-family: 'Inter', sans-serif; }
            .filter-btn.active { background-color: #1e293b !important; color: white !important; border-color: #1e293b !important; }
            .filter-btn.active span { background-color: rgba(255,255,255,0.2) !important; color: white !important; }
        </style>
    </head>
    <body class="bg-[#F6F8FA] text-slate-900">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-16">
            <header class="mb-8 text-center">
                <div class="flex justify-center items-center mb-6">
                    <img src="${GITHUB_ICON_URL}" class="w-12 h-12 mr-4" alt="GitHub logo">
                    <h1 class="text-4xl sm:text-5xl font-extrabold text-slate-800 tracking-tight">
                        Github Trending
                    </h1>
                </div>
                <p class="text-slate-500 font-medium text-lg">每日 Star 增长最高项目排行</p>
                <div class="inline-flex items-center mt-6 px-4 py-1.5 bg-white border border-slate-200 rounded-full text-xs text-slate-500 font-mono shadow-sm">
                    <span class="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                    Update: ${now}
                </div>
            </header>

            <div class="flex flex-wrap justify-center gap-2 mb-12 max-w-4xl mx-auto">
                ${filterButtons}
            </div>

            <div id="repo-grid" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                ${cards}
            </div>

            <footer class="mt-20 text-center text-slate-400 text-sm flex justify-center items-center">
                <img src="${GITHUB_ICON_URL}" class="w-4 h-4 mr-2 opacity-50" alt="GitHub">
                Powered by Node.js & GitHub Actions
            </footer>
        </div>

        <script>
            // 初始化 ALL 按钮样式
            document.querySelector('[data-nav-lang="ALL"]').classList.add('active');

            function filterLang(lang) {
                const cards = document.querySelectorAll('.repo-card');
                const buttons = document.querySelectorAll('.filter-btn');

                buttons.forEach(btn => {
                    if (btn.getAttribute('data-nav-lang') === lang) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });

                cards.forEach(card => {
                    if (lang === 'ALL' || card.getAttribute('data-lang') === lang) {
                        card.style.display = 'flex';
                    } else {
                        card.style.display = 'none';
                    }
                });
            }
        </script>
    </body>
    </html>`;

    const distDir = path.join(__dirname, 'public');
    if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);
    fs.writeFileSync(path.join(distDir, 'index.html'), html);
}

async function run() {
    const repos = await fetchTrending();
    if (repos.length > 0) {
        generateHTML(repos);
        console.log('页面已生成，按 Star 数降序排列。');
    } else {
        process.exit(1);
    }
}

run();