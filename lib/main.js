'use babel'

import {CompositeDisposable} from 'atom'
import Plugin from './plugin'

let plugin
let disposable

export const activate = state => {
  plugin = new Plugin()
  disposable = new CompositeDisposable()
  disposable.add(atom.commands.add('atom-text-editor', {
    'codemod:apply-to-file': () => plugin.showCodemodList()
  }))
}

export const deactivate = () => {
  if (plugin != null) {
    plugin.dispose()
    plugin = null
    disposable.dispose()
  }
}
