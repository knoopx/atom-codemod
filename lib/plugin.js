'use babel'

import {BufferedProcess} from 'atom'
import Path from 'path'
import glob from 'glob-promise'
import CodemodListView from './codemod-list-view'

export default class Plugin {
  async getTransformList() {
    const paths = this.getCodemodPaths()

    return Promise.all(paths.map(([basePath, expr]) => {
      return glob(Path.join(basePath, expr)).then(transforms =>
        transforms.map(filePath => {
          const displayName = Path.relative(basePath, filePath)
          return {displayName, filePath}
        })
      )
    })).then(arr => arr.reduce((result, transforms) => result.concat(transforms), []))
  }

  getCodemodPaths() {
    return [
      [this.getActiveProjectPath(), 'transforms/*.js'],
      [Path.join(process.env.HOME, 'codemods'), '/*/transforms/*.js']
    ]
  }

  getActiveProjectPath() {
    const activeFilePath = atom.workspace.getActiveTextEditor().getPath()
    const [projectPath] = atom.project.relativizePath(activeFilePath)
    return projectPath
  }

  async showCodemodList() {
    const transforms = await this.getTransformList()
    const availableCodemodsView = new CodemodListView(transforms, item => {
      this.applyToFile(item)
      availableCodemodsView.cancel()
    })
  }

  runExternalTransform(transformPath, targetPath) {
    const stdout = []
    const stderr = []
    new BufferedProcess({
      command: 'jscodeshift',
      args: ['-t', transformPath, targetPath],
      stdout(line) {
        console.log(line)
        stdout.push(line)
      },
      stderr(line) {
        console.error(line)
      },
      exit(returnCode) {
        console.info(`Process exited with code ${returnCode}`)
        if (stderr.length > 0) {
          atom.notifications.addError('Transform failed', {detail: stderr.join('\n')})
        } else {
          atom.notifications.addSuccess('Transform applied', {detail: stdout.join('\n')})
        }
      }
    })
  }

  applyToFile(transform) {
    const editor = atom.workspace.getActiveTextEditor()
    if (!editor) {
      atom.notifications.addWarning('No file opened', {
        dismissable: true,
        detail: 'You dont\'t have any file focused'
      })
      return
    }
    this.runExternalTransform(transform.filePath, editor.getPath())
  }
}
