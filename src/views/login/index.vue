<script setup lang="ts">
import { Field, Form } from 'vee-validate'
import * as Yup from 'yup'

import { useTokenAuthStore } from '@/store'
import { login } from '@/api'

const schema = Yup.object().shape({
  username: Yup.string().required('Username is required'),
  password: Yup.string().required('Password is required'),
})

async function onSubmit(values: any) {
  const toeknAuthStore = useTokenAuthStore()
  const { username, password } = values
  const resp = await login({ username, password })
  if (resp.code === 200) {
    toeknAuthStore.updateAuthInfo({
      username: resp.data.user,
      token: resp.data.token,
    })
  }
}
</script>

<template>
  <div class="card m-3">
    <h4 class="card-header">
      Login
    </h4>
    <div class="card-body">
      <Form v-slot="{ errors, isSubmitting }" :validation-schema="schema" @submit="onSubmit">
        <div class="form-group">
          <label>Username</label>
          <Field name="username" type="text" class="form-control" :class="{ 'is-invalid': errors.username }" />
          <div class="invalid-feedback">
            {{ errors.username }}
          </div>
        </div>
        <div class="form-group">
          <label>Password</label>
          <Field name="password" type="password" class="form-control" :class="{ 'is-invalid': errors.password }" />
          <div class="invalid-feedback">
            {{ errors.password }}
          </div>
        </div>
        <div class="form-group">
          <button class="btn btn-primary" :disabled="isSubmitting">
            <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1" />
            Login
          </button>
          <router-link to="register" class="btn btn-link">
            Register
          </router-link>
        </div>
      </Form>
    </div>
  </div>
</template>
