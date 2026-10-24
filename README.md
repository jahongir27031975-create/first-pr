# Мой первый PR

Учебный репозиторий для знакомства с Git и GitHub.

## Как предложить изменение

1. Создайте отдельную ветку: `git switch -c docs/my-change`.
2. Измените README и сохраните файл.
3. Проверьте изменения: `git diff`.
4. Подготовьте файл: `git add README.md`.
5. Сохраните изменение в истории: `git commit -m "docs: improve README"`.
6. Отправьте ветку на GitHub: `git push -u origin docs/my-change`.
7. Откройте pull request (PR): `gh pr create --base main`.

В PR опишите, что изменилось и как вы проверили результат.
После проверки PR можно объединить с основной веткой `main` на GitHub.
