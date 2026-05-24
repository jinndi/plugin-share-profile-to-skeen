import CryptoJS from 'https://cdn.jsdelivr.net/npm/crypto-js@4.2.0/+esm'

///// Плагин синхранизации настроек GUI.for.SingBox с Gists (профили, задачи и тд.)
// 1. Создайте вручную плагин в GUI.for.SingBox и вставьте это содержимое
// 2. Заполните ниже токен доступа Gist и ключ шифрования и дешифрования

// Токен с доступом к Gists (создать в https://github.com/settings/tokens).
const Authorization = ""
// Ключ, используемый для шифрования и дешифрования (придумать).
const Secret = ""

const onRun = async () => {
  const action = await Plugins.picker.single(
    'Выберите действие',
    [
      { label: 'Создать резервную копию', value: 'backup' },
      { label: 'Синхронизировать локально', value: 'sync' },
      { label: 'Просмотреть список резервных копий', value: 'list' },
      { label: 'Удаление резерных копий', value: 'remove' }
    ],
    []
  )

  const handler = {
    backup: Backup,
    sync: Sync,
    list: List,
    remove: Remove
  }

  await handler[action]()
}

/**
 * Хук плагина: ПКМ - Синхронизировать локально
 */
const Sync = async () => {
  const list = await httpGet('/gists')
  const _list = filterList(list)

  if (_list.length === 0) throw 'Нет резервных копий для синхронизации'

  const gistId = await Plugins.picker.single(
    'Список резервных копий Gists:',
    _list,
    [_list[0].value]
  )

  const files = Object.values(list.find((v) => v.id === gistId).files)
  const { id } = Plugins.message.info('Выполняется синхронизация...', 60 * 60 * 1000)

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    Plugins.message.update(id, `Синхронизация...[ ${i + 1}/${files.length} ]`)

    try {
      const { body: encrypted } = await Plugins.HttpGet(file.raw_url)
      await Plugins.WriteFile(
        file.filename.replaceAll('\\', '/'),
        decrypt(encrypted)
      )
    } catch (error) {
      console.log(error)
      Plugins.message.update(id, `[${file.filename}] ошибка синхронизации`, 'error')
      await Plugins.sleep(1000)
    } finally {
      await Plugins.sleep(100)
    }
  }

  Plugins.message.update(id, 'Синхронизация завершена, интерфейс будет перезагружен', 'success')
  await Plugins.sleep(1500).then(() => Plugins.message.destroy(id))
  const kernelApiStore = Plugins.useKernelApiStore()

  if (kernelApiStore.running) {
    await kernelApiStore.stopCore()
  }

  await Plugins.WindowReloadApp()
}

/**
 * Хук плагина: ПКМ - Создать резервную копию
 */
const Backup = async () => {
  const files = [
    'data/user.yaml',
    'data/profiles.yaml',
    'data/subscribes.yaml',
    'data/rulesets.yaml',
    'data/plugins.yaml',
    'data/scheduledtasks.yaml'
  ]

  const subscribesStore = Plugins.useSubscribesStore()
  const pluginsStore = Plugins.usePluginsStore()
  const rulesetsStore = Plugins.useRulesetsStore()

  const l1 = subscribesStore.subscribes
    .map((v) => v.path)
    .filter((v) => v.startsWith('data'))

  const l2 = pluginsStore.plugins
    .map((v) => v.path)
    .filter((v) => v.startsWith('data'))

  const l3 = rulesetsStore.rulesets
    .map((v) => v.path)
    .filter((v) =>
      v.startsWith('data') &&
      (v.endsWith('yaml') || v.endsWith('json'))
    )

  files.push(...l1, ...l2, ...l3)
  const { id } = Plugins.message.info('Создание резервной копии...', 60 * 60 * 1000)
  const filesMap = {}

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    Plugins.message.update(id, `Создание резервной копии...[ ${i + 1}/${files.length} ]`)
    try {
      const text = await Plugins.ignoredError(Plugins.ReadFile, file)
      if (text) {
        filesMap[file.replaceAll('/', '\\')] = {
          content: encrypt(text)
        }
      }
    } catch (error) {
      console.log(error)
      Plugins.message.destroy(id)
      throw error
    } finally {
      await Plugins.sleep(100)
    }
  }

  try {
    if (Object.keys(filesMap).length === 0)
      throw 'Отсутствуют файлы для резервного копирования'

    Plugins.message.update(id, 'Выполняется резервное копирование...', 'info')
    await httpPost('/gists', {
      description: getPrefix() + '_' + new Date().toLocaleString() + '_backup',
      public: false,
      files: filesMap
    })
    Plugins.message.update(id, 'Резервное копирование завершено', 'success')
  } catch (error) {
    Plugins.message.update(
      id,
      `Ошибка резервного копирования: ` + (error.message || error),
      'error'
    )
  }
  await Plugins.sleep(1500).then(() => Plugins.message.destroy(id))
}

const List = async () => {
  const list = await httpGet('/gists')
  const _list = filterList(list)
  if (_list.length === 0) throw 'Список резервных копий пуст'
  await Plugins.picker.single(
    'Список резервных копий Gists:',
    _list,
    []
  )
}

const Remove = async () => {
  const list = await httpGet('/gists')
  const _list = filterList(list)
  if (_list.length === 0) throw 'Нет резервных копий для управления'
  const ids = await Plugins.picker.multi(
    'Выберите резервные копии для удаления',
    _list,
    []
  )
  for (let i = 0; i < ids.length; i++) {
    await httpDelete('/gists/' + ids[i])
    Plugins.message.success('Удалено успешно: ' + ids[i])
  }
}

const getPrefix = () => {
  return Plugins.APP_TITLE.includes('Clash')
    ? 'GUI.for.Clash'
    : 'GUI.for.SingBox'
}

const filterList = (list) => {
  const prefix = getPrefix()
  return list
    .filter((v) => v.description && v.description.startsWith(prefix))
    .map((v) => ({
      label: v.description,
      value: v.id
    }))
}

/**
 * Шифрование
 */
function encrypt(data) {
  if (!Secret) throw 'Ключ не настроен'
  return CryptoJS.AES.encrypt(data, Secret).toString()
}

/**
 * Расшифровка
 */
function decrypt(data) {
  if (!Secret) throw 'Ключ не настроен'

  return CryptoJS.AES.decrypt(data, Secret)
    .toString(CryptoJS.enc.Utf8)
}

async function httpGet(url) {
  if (!Authorization) throw 'TOKEN не настроен'

  const { body } = await Plugins.HttpGet(
    `https://api.github.com${url}`,
    {
      'User-Agent': 'GUI.for.Cores',
      'X-GitHub-Api-Version': '2022-11-28',
      Accept: 'application/vnd.github+json',
      Connection: 'close',
      Authorization: 'Bearer ' + Authorization
    }
  )

  if (body.message) {
    throw body.message
  }
  return body
}

async function httpPost(url, data) {
  if (!Authorization) throw 'TOKEN не настроен'

  const { body } = await Plugins.HttpPost(
    `https://api.github.com${url}`,
    {
      'User-Agent': 'GUI.for.Cores',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      Accept: 'application/vnd.github+json',
      Connection: 'close',
      Authorization: 'Bearer ' + Authorization
    },
    data
  )

  if (body.message) {
    throw body.message
  }
  return body
}

async function httpDelete(url) {
  if (!Authorization) throw 'TOKEN не настроен'

  const { body } = await Plugins.HttpDelete(
    `https://api.github.com${url}`,
    {
      'User-Agent': 'GUI.for.Cores',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      Accept: 'application/vnd.github+json',
      Connection: 'close',
      Authorization: 'Bearer ' + Authorization
    }
  )

  if (body.message) {
    throw body.message
  }
  return body
}