# Rollup-plugin-aliasexternal

this module was inspired by https://github.com/rollup/rollup-plugin-alias

the main focus this module is to resolve alias inside node_module when bundling package with Rollup

# Usage

```javascript
// rollup.config.js
import aliasExternal from 'rollup-plugin-aliasexternal';

export default {
  input: './src/index.js',
  plugins: [
    aliasExternal(
      'module_name'
      entries:[
        {find:'something', replacement: '../../../something'}
      ]
    )
  ],
};
```