import React, {Component} from 'react'
import { DragSource, DropTarget } from 'react-dnd'
import style from './EntityTree.scss'
import { checkIsGroupNode, checkIsGroupEntityNode, getNodeDOMId, getNodeTitleDOMId, getAllEntitiesInHierarchy } from './utils'
import ENTITY_NODE_DRAG_TYPE from './nodeDragType'
import { entitySets, entityTreeItemComponents, entityTreeIconResolvers } from '../../lib/configuration.js'

const nodeSource = {
  beginDrag (props, monitor, component) {
    const node = props.node

    return {
      entitySet: node.data.__entitySet,
      isGroupEntity: checkIsGroupEntityNode(node),
      isCollapsed: props.isCollapsed,
      node
    }
  }
}

const nodeTarget = {
  hover (props, monitor, component) {
    const { node } = props

    if (monitor.isOver({ shallow: true }) && props.onDragOver) {
      props.onDragOver({
        entitySet: node.data.__entitySet,
        isGroupEntity: checkIsGroupEntityNode(node),
        isCollapsed: props.isCollapsed,
        targetNode: node
      })
    }
  },
  drop (props, monitor, component) {
    const { childrenLoading } = component.state

    if (monitor.didDrop()) {
      return
    }

    if (childrenLoading !== false) {
      return { cancelled: true }
    }
  }
}

function collectForSource (connect, monitor) {
  return {
    connectDragSource: connect.dragSource(),
    connectDragPreview: connect.dragPreview(),
    isDragging: monitor.isDragging()
  }
}

function collectForTarget (connect, monitor) {
  return {
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver()
  }
}

class EntityTreeNode extends Component {
  constructor (props) {
    super(props)

    this.getDOMId = this.getDOMId.bind(this)
    this.getTitleDOMId = this.getTitleDOMId.bind(this)
    this.collapse = this.collapse.bind(this)

    this.state = {
      childrenLoading: false
    }
  }

  componentDidMount () {
    const { registerEntityNode, node } = this.props
    const isEntityNode = checkIsGroupNode(node) ? checkIsGroupEntityNode(node) : true

    if (!isEntityNode) {
      return
    }

    registerEntityNode(node.data._id, Object.assign({}, node, { objectId: this.props.id }))
  }

  componentWillReceiveProps (nextProps) {
    const { childrenLoading } = this.state
    const props = this.props

    if (
      childrenLoading !== false &&
      props.node.data &&
      nextProps.node.data &&
      props.node.data._id === nextProps.node.data._id &&
      props.node.data.__childrenLoaded !== true &&
      nextProps.node.data.__childrenLoaded === true
    ) {
      this.setState({
        childrenLoading: false
      })
    }
  }

  componentDidUpdate (prevProps) {
    const { registerEntityNode, node } = this.props
    const { node: prevNode } = prevProps
    const wasEntityNode = checkIsGroupNode(prevNode) ? checkIsGroupEntityNode(prevNode) : true
    const isEntityNode = checkIsGroupNode(node) ? checkIsGroupEntityNode(node) : true

    if (node.data._id !== prevNode.data._id) {
      if (wasEntityNode) {
        registerEntityNode(prevNode.data._id, null)
      }

      if (isEntityNode) {
        registerEntityNode(node.data._id, Object.assign({}, node, { objectId: this.props.id }))
      }
    }

    if (node.data._id === prevNode.data._id) {
      registerEntityNode(node.data._id, Object.assign({}, node, { objectId: this.props.id, items: node.items || [] }))
    }
  }

  componentWillUnmount () {
    const { registerEntityNode, node } = this.props
    const isEntityNode = checkIsGroupNode(node) ? checkIsGroupEntityNode(node) : true

    if (!isEntityNode) {
      return
    }

    registerEntityNode(node.data._id, null)
  }

  connectDragging (el) {
    const { childrenLoading } = this.state
    const { selectable, draggable, connectDragSource, connectDragPreview } = this.props
    const isLoading = childrenLoading !== false

    if (selectable || !draggable || isLoading) {
      return el
    }

    return connectDragSource(connectDragPreview(el, { captureDraggingState: true }))
  }

  connectDropping (el) {
    const { selectable, draggable, connectDropTarget } = this.props

    if (selectable || !draggable) {
      return el
    }

    return connectDropTarget(el)
  }

  collapse (objectId) {
    const { childrenLoading } = this.state
    const { node } = this.props

    const params = {
      objectId
    }

    if (childrenLoading !== false) {
      return
    }

    if (checkIsGroupEntityNode(node)) {
      params.id = node.data._id

      if (node.data.__childrenLoaded !== true) {
        this.setState({
          childrenLoading: 'initial'
        })

        setTimeout(() => {
          if (this.props.node.data.__childrenLoaded !== true) {
            this.setState({
              childrenLoading: 'animation'
            })
          }
        }, 250)
      }
    }

    this.props.collapseNode(params)
  }

  getDOMId (node) {
    if (checkIsGroupNode(node) && !checkIsGroupEntityNode(node)) {
      return undefined
    }

    return getNodeDOMId(node.data)
  }

  getTitleDOMId (node) {
    if (checkIsGroupNode(node) && !checkIsGroupEntityNode(node)) {
      return undefined
    }

    return getNodeTitleDOMId(node.data)
  }

  resolveEntityTreeIconStyle (entity, info) {
    for (const k in entityTreeIconResolvers) {
      const mode = entityTreeIconResolvers[k](entity, info)
      if (mode) {
        return mode
      }
    }

    return null
  }

  renderEntityTreeItemComponents (position, propsToItem, originalChildren) {
    if (position === 'container') {
      // if there are no components registered, defaults to original children
      if (!entityTreeItemComponents[position].length) {
        return originalChildren
      }

      // composing components when position is container
      const wrappedItemElement = entityTreeItemComponents[position].reduce((prevElement, b) => {
        if (prevElement == null) {
          return React.createElement(b, propsToItem, originalChildren)
        }

        return React.createElement(b, propsToItem, prevElement)
      }, null)

      if (!wrappedItemElement) {
        return null
      }

      return wrappedItemElement
    }

    return entityTreeItemComponents[position].map((p, i) => (
      React.createElement(p, {
        key: i,
        ...propsToItem
      }))
    )
  }

  renderGroupNode () {
    const { childrenLoading } = this.state

    const {
      node,
      depth,
      id,
      isActive,
      isCollapsed,
      isDragging,
      contextMenuActive,
      selectable,
      draggable,
      showContextMenu,
      paddingByLevel,
      renderTree,
      renderContextMenu,
      onNewClick,
      onNodeSelect
    } = this.props

    const name = node.name
    const items = node.items
    const extraPropsSelectable = {}
    const groupStyle = node.data != null ? this.resolveEntityTreeIconStyle(node.data, { isCollapsed }) : null
    const isLoading = childrenLoading !== false
    const shouldShowLoading = childrenLoading === 'animation'
    let groupIsEntity = checkIsGroupEntityNode(node)

    if (groupIsEntity) {
      if (selectable) {
        extraPropsSelectable.checked = node.data.__selected !== false
      } else {
        extraPropsSelectable.defaultChecked = true
      }
    }

    return (
      <div id={this.getDOMId(node)} style={{ opacity: shouldShowLoading ? 0.6 : 1 }}>
        <div
          className={`${style.link} ${contextMenuActive ? style.focused : ''} ${(isActive && !isDragging) ? style.active : ''} ${isDragging ? style.dragging : ''}`}
          onContextMenu={groupIsEntity ? (e) => showContextMenu(e, node.data) : undefined}
          onClick={(ev) => { if (!selectable) { ev.preventDefault(); ev.stopPropagation(); this.collapse(id) } }}
          style={{ paddingLeft: `${(depth + 1) * paddingByLevel}rem` }}
        >
          {selectable ? <input type='checkbox' {...extraPropsSelectable} onChange={(v) => {
            onNodeSelect(getAllEntitiesInHierarchy(node, true), !!v.target.checked)
          }} /> : null}
          <span
            id={this.getTitleDOMId(node)}
            className={`${style.nodeTitle} ${isCollapsed ? style.collapsed : ''}`}
            onClick={(ev) => { if (selectable) { ev.preventDefault(); ev.stopPropagation(); this.collapse(id) } }}
          >
            {this.connectDragging(
              <div className={`${style.nodeBoxItemContent} ${isDragging ? style.dragging : ''}`}>
                {groupStyle && (
                  <i key='entity-icon' className={style.entityIcon + ' fa ' + (groupStyle || '')} />
                )}
                {name + (groupIsEntity && node.data.__isDirty ? '*' : '')}
                {shouldShowLoading && (
                  <span style={{ display: 'inline-block' }}>
                    <span className={style.loadingDot}>.</span>
                    <span className={style.loadingDot}>.</span>
                    <span className={style.loadingDot}>.</span>
                  </span>
                )}
              </div>
            )}
          </span>
          {this.renderEntityTreeItemComponents('groupRight', node.data, undefined)}
          {node.isEntitySet ? (
            !selectable ? <a key={id + 'new'} onClick={() => onNewClick(name)} className={style.add}></a> : null
          ) : null}
          {(groupIsEntity && !isLoading) ? renderContextMenu(
            node.data,
            { isGroupEntity: groupIsEntity, node }
          ) : null}
        </div>
        <div className={`${style.nodeContainer} ${isDragging ? style.dragging : ''} ${isCollapsed ? style.collapsed : ''}`}>
          {renderTree(items, depth + 1, id, draggable)}
        </div>
      </div>
    )
  }

  renderEntityNode () {
    const {
      node,
      depth,
      selectable,
      isActive,
      isDragging,
      contextMenuActive,
      originalEntities,
      paddingByLevel,
      renderContextMenu,
      getEntityTypeNameAttr,
      showContextMenu,
      onClick
    } = this.props

    const entity = node.data
    const entityStyle = this.resolveEntityTreeIconStyle(entity, {})

    return (
      <div
        id={this.getDOMId(node)}
        onContextMenu={(e) => showContextMenu(e, entity)}
        onClick={() => onClick(entity)}
        key={entity._id}
        className={`${style.link} ${contextMenuActive ? style.focused : ''} ${(isActive && !isDragging) ? style.active : ''} ${isDragging ? style.dragging : ''}`}
        style={{ paddingLeft: `${(depth + 1) * paddingByLevel}rem` }}
      >
        {this.renderEntityTreeItemComponents('container', { entity, entities: originalEntities }, [
          this.connectDragging(
            <div
              id={this.getTitleDOMId(node)}
              key='container-entity'
              className={`${style.nodeBoxItemContent} ${isDragging ? style.dragging : ''}`}
            >
              {selectable ? <input key='search-name' type='checkbox' readOnly checked={entity.__selected !== false} /> : null}
              <i key='entity-icon' className={style.entityIcon + ' fa ' + (entityStyle || (entitySets[entity.__entitySet].faIcon || style.entityDefaultIcon))}></i>
              <a key='entity-name'>{getEntityTypeNameAttr(entity.__entitySet, entity) + (entity.__isDirty ? '*' : '')}</a>
              {this.renderEntityTreeItemComponents('right', { entity, entities: originalEntities })}
            </div>
          ),
          renderContextMenu(entity, { node })
        ])}
      </div>
    )
  }

  render () {
    const { node } = this.props
    const isGroupNode = checkIsGroupNode(node)

    return this.connectDropping(
      <div
        className={`${style.nodeBox} ${!isGroupNode ? style.nodeBoxItem : ''}`}
      >
        {isGroupNode ? (
          this.renderGroupNode()
        ) : (
          this.renderEntityNode()
        )}
      </div>
    )
  }
}

export default DragSource(
  ENTITY_NODE_DRAG_TYPE,
  nodeSource,
  collectForSource
)(DropTarget(
  ENTITY_NODE_DRAG_TYPE,
  nodeTarget,
  collectForTarget
)(EntityTreeNode))
