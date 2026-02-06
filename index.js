const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

async function fetchTrending() {
    try {
        const { data } = await axios.get('https://github.com/trending', {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(data);
        const repos = [];

        $('article.Box-row').each((i, el) => {
            const title = $(el).find('h2.h3 a').text().trim().replace(/\s+/g, '');
            const link = 'https://github.com' + $(el).find('h2.h3 a').attr('href');
            const desc = $(el).find('p.my-1').text().trim() || 'No description provided.';
            const lang = $(el).find('[itemprop="programmingLanguage"]').text().trim() || 'Plain Text';
            const starsToday = $(el).find('span.d-inline-block.float-sm-right').text().trim();

            repos.push({ title, link, desc, lang, starsToday });
        });

        return repos;
    } catch (error) {
        console.error('抓取失败:', error);
        return [];
    }
}

function generateHTML(repos) {
    const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });

    const cards = repos.map(repo => `
        <div class="group bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
            <div class="flex justify-between items-start mb-3">
                <span class="text-xs font-bold px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg">${repo.lang}</span>
                <span class="text-xs text-amber-500 font-medium">🔥 ${repo.starsToday}</span>
            </div>
            <a href="${repo.link}" target="_blank" class="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                ${repo.title}
            </a>
            <p class="text-slate-500 text-sm mt-3 line-clamp-3 leading-relaxed">
                ${repo.desc}
            </p>
            <div class="mt-6 pt-4 border-t border-slate-50 flex items-center text-indigo-600 font-semibold text-sm">
                查看项目 <span class="ml-1 group-hover:ml-2 transition-all">→</span>
            </div>
        </div>
    `).join('');

    const html = `
    <!DOCTYPE html>
    <html lang="zh">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Github Trending Daily</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');
            body { font-family: 'Inter', sans-serif; }
        </style>
    </head>
    <body class="bg-slate-50 text-slate-900">
        <div class="max-w-6xl mx-auto px-6 py-16">
            <header class="mb-16 text-center">
                <h1 class="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 mb-4">
                    Github Trending
                </h1>
                <p class="text-slate-500 font-medium">每日自动更新的热门开源项目预览</p>
                <div class="inline-block mt-6 px-4 py-1.5 bg-slate-200 rounded-full text-xs text-slate-600 font-mono">
                    Last Update: ${now}
                </div>
            </header>

            <div class="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                ${cards}
            </div>

            <footer class="mt-20 text-center text-slate-400 text-sm">
                Powered by Node.js & GitHub Actions
            </footer>
        </div>
    </body>
    </html>`;

    const distDir = path.join(__dirname, 'public');
    if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);
    fs.writeFileSync(path.join(distDir, 'index.html'), html);
}

async function run() {
    console.log('正在获取数据...');
    const repos = await fetchTrending();
    console.log(`成功获取 ${repos.length} 个项目，正在生成页面...`);
    generateHTML(repos);
    console.log('完成！');
}

run();