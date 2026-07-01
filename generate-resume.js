const fs = require('fs');
const https = require('https');

const GITHUB_USERNAME = 'golden67281';
const METADATA_PATH = './projects-metadata.json';
const TEMPLATE_PATH = './resume-template.html';
const OUTPUT_PATH = './resume.html';

// Helper to make HTTPS requests natively
function getJSON(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'NodeJS-Resume-Generator',
        ...headers
      }
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse JSON response: ' + data));
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('Generating resume...');

  // 1. Read local files
  let metadata = {};
  if (fs.existsSync(METADATA_PATH)) {
    metadata = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));
  }
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

  // 2. Fetch GitHub Repositories
  let repos = [];
  try {
    const headers = {};
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }
    const rawRepos = await getJSON(`https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=100`, headers);
    if (Array.isArray(rawRepos)) {
      repos = rawRepos.filter(r => !r.fork);
    } else {
      console.warn('API returned non-array:', rawRepos);
    }
  } catch (error) {
    console.error('Error fetching repositories, using mock/local list:', error.message);
  }

  // Normalize name matching (e.g. replace dashes with underscores, lowercase match)
  function getMetadataKey(repoName) {
    const clean = name => name.toLowerCase().replace(/[-]/g, '_');
    return Object.keys(metadata).find(k => clean(k) === clean(repoName));
  }

  // 3. Build projects list
  const projectsHtml = [];
  const processedKeys = new Set();

  // First, process repositories that exist in our high-quality metadata database
  for (const repo of repos) {
    const key = getMetadataKey(repo.name);
    if (key) {
      processedKeys.add(key);
      const bullets = metadata[key];
      const displayName = key.replace(/_/g, ' ');
      const lang = repo.language || 'Python, HTML';
      projectsHtml.push(renderProject(displayName, lang, bullets));
    }
  }

  // Include any metadata projects that were not found in the fetched GitHub list (offline backup)
  for (const key in metadata) {
    if (!processedKeys.has(key)) {
      const bullets = metadata[key];
      const displayName = key.replace(/_/g, ' ');
      projectsHtml.push(renderProject(displayName, 'Python, Flask, MySQL', bullets));
    }
  }

  // Then, append other active GitHub repositories (up to a limit to prevent resume page bleed)
  // We limit the total projects to 3 to guarantee it fits on exactly 1 page
  const maxProjects = 3;
  let addedCount = projectsHtml.length;

  for (const repo of repos) {
    if (addedCount >= maxProjects) break;
    const key = getMetadataKey(repo.name);
    if (!key && repo.description && repo.name !== GITHUB_USERNAME) {
      const displayName = repo.name.replace(/_/g, ' ').replace(/[-]/g, ' ');
      const lang = repo.language || 'Code';
      const bullets = [repo.description];
      projectsHtml.push(renderProject(displayName, lang, bullets));
      addedCount++;
    }
  }

  // Limit final output to keep the exact 1-page structure
  const finalProjects = projectsHtml.slice(0, maxProjects);

  // 4. Inject into template
  const placeholderStart = '<!-- DYNAMIC_PROJECTS_START -->';
  const placeholderEnd = '<!-- DYNAMIC_PROJECTS_END -->';

  const startIndex = template.indexOf(placeholderStart);
  const endIndex = template.indexOf(placeholderEnd);

  if (startIndex === -1 || endIndex === -1) {
    throw new Error('Template is missing dynamic project placeholders.');
  }

  const updatedContent = 
    template.substring(0, startIndex + placeholderStart.length) + '\n' +
    finalProjects.join('\n') + '\n' +
    template.substring(endIndex);

  fs.writeFileSync(OUTPUT_PATH, updatedContent, 'utf8');
  console.log('Successfully generated resume.html!');
}

function renderProject(name, lang, bullets) {
  return `      <div class="item-group">
        <div class="flex-row">
          <span class="bold-text">${name} | ${lang}</span>
        </div>
        <ul>
          ${bullets.map(b => `<li>${b}</li>`).join('\n          ')}
        </ul>
      </div>`;
}

run().catch(console.error);
