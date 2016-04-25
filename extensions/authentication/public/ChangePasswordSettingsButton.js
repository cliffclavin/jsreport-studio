import React, { Component } from 'react'
import Studio from 'jsreport-studio'

export default class ChangePasswordSettingsButton extends Component {
  render () {
    return Studio.authentication.user.isAdmin ? <span /> : <div>
      <a
        id='changePassword'
        onClick={() => Studio.openModal('CHANGE_PASSWORD_MODAL', { entity: Studio.authentication.user })}
        style={{cursor: 'pointer'}}><i className='fa fa-key'></i>
        Change password
      </a>
    </div>
  }
}
