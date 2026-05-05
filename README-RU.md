## Синхронизация профиля из GUI.for.SingBox в SKeen

🇷🇺 **Русский** | [🇺🇸 English](README.md)

Генерирует конфигурацию sing-box для SKeen на основе профиля GUI.for.SingBox, включая необходимые входящие компоненты (**redirect-in** / **tproxy-in**) и панель **Zashboard**.


<img width="695" height="550" alt="edit" src="https://github.com/user-attachments/assets/0a876bc1-a1d8-4a28-a760-62c3844fc763" />
<img width="695" height="454" alt="sync" src="https://github.com/user-attachments/assets/99b658f1-3cfc-48b8-ae3f-ca6e9a9dad5f" />
<img width="695" height="454" alt="main" src="https://github.com/user-attachments/assets/15a791c5-f446-418b-a4f7-517062161410" />

<br>

Ссылка на плагин:

```
https://raw.githubusercontent.com/jinndi/sync-profile-to-skeen/main/sync-profile-to-skeen.js
```

### Использование в GUI.for.SingBox:

1. Установите и запустите [GUI.for.SingBox](https://github.com/GUI-for-Cores/GUI.for.SingBox).
2. Добавьте JSON-подписку(и) в разделе **Subscriptions** (например, через [s-ui](https://github.com/alireza0/s-ui)). Чтобы использовать другие типы подписок, включая те, что требуют HWID, предварительно установите плагин `plugin-node-convert` из раздела **Центр плагинов** в приложении.
3. Создайте и настройте шаг за шагом профиль в разделе **Profiles**.
4. Добавьте плагин в разделе **Plugins**, используя ссылку, указанную выше.
5. Выполните сгенерированную команду через SSH в Entware или через WEB CLI (parse).
6. Убедитесь, что в конфигурации SKeen (`skeen.json`) параметр `"sing_config.enable"` установлен в значение `1`.
7. Перезапустите SKeen с помощью команды SSH `skeen restart` или через WEB CLI `exec skeen restart`.
