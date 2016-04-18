import React, {Component, PropTypes} from 'react'
import {connect} from 'react-redux'
import { actions, selectors } from 'redux/editor'
import * as entities from 'redux/entities'
import Preview from '../../components/Preview/Preview.js'
import EntityTree from '../../components/EntityTree/EntityTree.js'
import Properties from '../../components/Properties/Properties.js'
import style from './App.scss'
import Toolbar from '../../components/Toolbar/Toolbar.js'
import _debounce from 'lodash/debounce'
import Helmet from 'react-helmet'
import preview from '../../helpers/preview'
import SplitPane from '../../components/common/SplitPane/SplitPane.js'
import EditorTabs from '../../components/Tabs/EditorTabs.js'
import Studio from 'Studio.js'
import Modal from '../Modal/Modal.js'
import { actions as modalActions } from '../../redux/modal'

@connect((state) => ({
  entities: state.entities,
  references: entities.selectors.getReferences(state),
  activeTab: state.editor.activeTab,
  isPending: state.editor.isPending,
  canRun: selectors.canRun(state),
  canSave: selectors.canSave(state),
  canSaveAll: selectors.canSaveAll(state),
  canRemove: selectors.canRemove(state),
  tabsWithEntities: selectors.getTabWithEntities(state),
  activeEntity: selectors.getActiveEntity(state)
}), { ...actions, ...modalActions })
export default class App extends Component {
  static contextTypes = {
    store: PropTypes.object.isRequired
  }

  static propTypes = {
    entities: PropTypes.object,
    references: PropTypes.object,
    tabsWithEntities: PropTypes.array,
    currentDetail: PropTypes.object,
    error: PropTypes.string,
    loading: PropTypes.bool,
    loaded: PropTypes.bool
  };

  constructor () {
    super()
    this.state = { modalIsOpen: true }
  }

  componentDidMount () {
    this.update = _debounce(this.props.update, 500, { leading: true })
    if (this.props.params.shortid) {
      this.props.openTab({ shortid: this.props.params.shortid, entitySet: this.props.params.entitySet })
      return
    }

    return this.props.openTab({ key: 'StartupPage', editorComponentKey: 'startup', title: 'Statup' })
  }

  componentDidUpdate () {
    this.props.updateHistory()
  }

  handleRun () {
    let template = Object.assign({}, this.props.activeEntity)
    let request = { template: template }
    Studio.onPreview(request, Object.assign({}, this.props.entities))
    preview(request, 'previewFrame')
  }

  handleSplitChanged () {
    this.refs.editorTabs.resize()
    this.refs.preview.resizeStarted()
  }

  handleSplitDragFinished () {
    this.refs.preview.resizeEnded()
  }

  render () {
    const { tabsWithEntities, references, saveAll, isPending, canRun, canSave, canRemove, canSaveAll, activeTab, entities,
      remove, openTab, openComponent, activateTab, openNewTab, activeEntity, update, save, closeTab } = this.props

    console.log('render main')

    return (
      <div className='container'>
        <Helmet/>
        <Modal/>

        <div className={style.appContent + ' container'}>
          <div className='block'>
            <Toolbar
              canRun={canRun} canSave={canSave} canSaveAll={canSaveAll} canRemove={canRemove} onSave={save}
              onSaveAll={saveAll} isPending={isPending}
              onRemove={remove} onRun={() => this.handleRun()}/>

            <div className='block'>
              <SplitPane
                resizerClassName='resizer' defaultSize='80%' onChange={() => this.handleSplitChanged()}
                onDragFinished={() => this.handleSplitDragFinished()}>
                <SplitPane
                  resizerClassName='resizer-horizontal' split='horizontal'
                  defaultSize={(window.innerHeight * 0.4) + 'px'}>
                  <EntityTree
                    activeEntity={activeEntity} entities={references} onClick={(_id) => openTab({_id: _id})}
                    onNewClick={(es) => openComponent('NEW_ENTITY_MODAL', {entitySet: es})}/>
                  <Properties entity={activeEntity} entities={entities} onChange={update}/>
                </SplitPane>
                <SplitPane
                  onChange={() => this.handleSplitChanged()} onDragFinished={() => this.handleSplitDragFinished()}
                  resizerClassName='resizer'>
                  <EditorTabs
                    activeTabKey={activeTab} ref='editorTabs' activateTab={activateTab} closeTab={closeTab}
                    onUpdate={(v) => this.update(v)} tabs={tabsWithEntities}/>
                  <Preview ref='preview'/>
                </SplitPane>
              </SplitPane>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
