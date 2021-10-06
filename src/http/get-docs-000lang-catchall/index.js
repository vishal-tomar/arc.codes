// eslint-disable-next-line
require = require('esm')(module)

const path = require('path')
const { readFile } = require('fs/promises')
const { http } = require('@architect/functions')
const redirect = require('@architect/shared/redirect')
const Markdown = require('markdown-it')
const markdownClass = require('@toycode/markdown-it-class')
const markdownAnchor = require('markdown-it-anchor')
const frontmatterParser = require('markdown-it-front-matter')
const yaml = require('js-yaml')
const classMapping = require('./markdown-class-mappings')
const highlighter = require('./highlighter')
const toc = require('@architect/views/docs/table-of-contents')
const Html = require('@architect/views/modules/document/html.js').default
const algolia = require('@architect/views/modules/components/algolia.js').default

const cache = {} // cheap warm cache

async function handler (req) {
  let { pathParameters } = req
  let { lang, proxy } = pathParameters
  let parts = proxy.split('/')
  let docName = parts.pop()

  if (docName === 'playground')
    return { statusCode: 303, headers: { location: '/playground' } }

  let doc = `${docName}.md`
  let activePath = path.join(
    'docs',
    lang,
    ...parts,
    docName
  )
  let editURL = 'https://github.com/architect/arc.codes/edit/main/src/views/docs/'
  editURL += path.join(
    lang,
    ...parts,
    doc
  )
  // Add leading slash to match anchor href
  let active = `/${activePath}`

  let filePath = path.join(
    __dirname,
    'node_modules',
    '@architect',
    'views',
    'docs',
    lang,
    ...parts,
    doc
  )
  let file
  try {
    if (!cache[filePath])
      cache[filePath] = await readFile(filePath, 'utf8')
    file = cache[filePath]
  }
  catch (err) {
    // TODO: Load category "index" landing or load next in section
    console.error(err)
    return {
      statusCode: 404,
      // TODO: send a friendly error page with message
      body: err.message
    }
  }

  let frontmatter = {}
  const markdown = new Markdown({
    linkify: true,
    html: true,
    typographer: true,
    highlight: await highlighter.forMarkdown()
  })
    .use(markdownClass, classMapping)
    .use(markdownAnchor, {
      permalinkSymbol: ' '
    })
    .use(frontmatterParser, function (str) {
      frontmatter = yaml.load(str)
    })
  const children = markdown.render(file)
  const { category, description, sections, title } = frontmatter

  return {
    statusCode: 200,
    headers: {
      'cache-control': 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0',
      'content-type': 'text/html; charset=utf8'
    },
    body: Html({
      active,
      category,
      children,
      description,
      editURL,
      lang,
      sections,
      scripts: [
        '/index.js',
        '/components/arc-viewer.js',
        '/components/arc-tab.js'
      ],
      thirdparty: algolia,
      title,
      toc
    })
  }
}

exports.handler = http.async(redirect, handler)
