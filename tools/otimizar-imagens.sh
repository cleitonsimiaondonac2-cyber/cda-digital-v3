#!/usr/bin/env bash
# ==========================================================================
#  CDA — pipeline de imagens
# --------------------------------------------------------------------------
#  Objectivo: photographs com qualidade consistente e peso razoavel.
#
#  Problema medido antes desta interveneçao:
#    - 19 MB em site/img/
#    - rácios dispares: 1943x839, 650x534, 1948x2560 (retrato), 1951x1425...
#    - ficheiros de 1,8 MB ao lado de outros de 220 KB
#    - duas fotografias com menos de 900 px de largura, querebem quando
#      aplicadas num cartao grande ou no hero
#
#  O que este script faz, por fotografia:
#    1. recorta para 16:9 (panoramico) centrado no ponto focal declarado
#    2. produz 1600 px (hero / destaque grande)
#    3. produz  900 px (cartao medio, coluna lateral)
#    4. produz  480 px (miniatura, grelha densa, mobile)
#    5. exporta WebP (q82) e JPEG (q86) em cada tamanho
#    6. escreve um manifesto JSON com srcset e dimensoes
#
#  Os originais NUNCA sao apagados: a pasta site/img/noticias/ fica intacta
#  e serve de fonte. O que se geram sao versoes derivadas em img/editorial/.
#
#  Uso:  bash tools/otimizar-imagens.sh
# ==========================================================================

set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ORIGEM="$RAIZ/site/img/noticias"
DESTINO="$RAIZ/site/img/editorial"
MANIFESTO="$DESTINO/manifesto.json"

[ -d "$ORIGEM" ] || { echo "ERRO: nao existe $ORIGEM" >&2; exit 1; }
mkdir -p "$DESTINO"

echo "==> A processar fotografias de $ORIGEM"

total_antes=0
total_depois=0
n=0

declare -a registos=()

for f in "$ORIGEM"/*.jpg; do
  [ -e "$f" ] || continue
  nome="$(basename "$f" .jpg)"
  antes=$(stat -c%s "$f")
  total_antes=$((total_antes + antes))
  n=$((n + 1))

  # Largura e altura de origem, para decidir o recorte
  # `identify` nao escreve newline no fim, e o `read` devolve estado de erro
  # mesmo tendo lido os valores — o que com `set -e` abortava o script.
  # O `printf` garante a newline.
  read -r OW OH < <(identify -format "%w %h" "$f"; printf '\n')

  entrada_json=""

  for L in 1600 900 480; do
    H=$(( L * 9 / 16 ))     # 16:9 exacto

    # Passo 1 — reduzir de modo a COBRIR o alvo (o `^` preenche o lado maior
    #           e transborda o outro; o crop de seguida corta o transbordo).
    # Passo 2 — cortar para o tamanho exacto.
    #
    # Retratos usam gravity North: numa fotografia vertical o sujeito está
    # normalmente na metade superior, e o centro cortava-lhe a cabeça.
    if [ "$OH" -gt "$OW" ]; then
      GRAV="North"
    else
      GRAV="center"
    fi

    base="$DESTINO/${nome}-${L}"
    convert "$f" \
      -auto-orient -strip \
      -resize "${L}x${H}^" \
      -gravity "$GRAV" -crop "${L}x${H}+0+0" +repage \
      -unsharp 0x0.75+0.75+0.01 \
      -quality 86 "${base}.jpg"
    cwebp -quiet -q 82 -m 6 "${base}.jpg" -o "${base}.webp"

    # o cwebp strips por conta propria; o jpg ja foi limpo acima
    jpg_sz=$(stat -c%s "${base}.jpg")
    webp_sz=$(stat -c%s "${base}.webp")
    total_depois=$((total_depois + webp_sz))

    entrada_json="$entrada_json{\"w\":$L,\"h\":$H,\"jpg\":\"editorial/${nome}-${L}.jpg\",\"webp\":\"editorial/${nome}-${L}.webp\",\"jpgBytes\":$jpg_sz,\"webpBytes\":$webp_sz},"
  done

  # a ultima variante fica com virgula final; remove-se para o JSON ser valido
  entrada_json="${entrada_json%,}"
  registos+=("{\"nome\":\"$nome\",\"origem\":\"noticias/${nome}.jpg\",\"origemBytes\":$antes,\"variantes\":[$entrada_json]}")
  printf "  %-38s %8s B  ->  480 / 900 / 1600 px (WebP + JPEG)\n" "$nome.jpg" "$antes"
done

{
  printf '{\n  "geradoEm": "%s",\n  "formato": "16:9",\n  "noticias": [\n' "$(date -Iseconds)"
  for i in "${!registos[@]}"; do
    [ "$i" -gt 0 ] && printf ',\n'
    printf '    %s' "${registos[$i]}"
  done
  printf '\n  ]\n}\n'
} > "$MANIFESTO"

echo
echo "==> Resumo"
printf "  fotografias:     %d\n" "$n"
printf "  peso original:   %s\n" "$(numfmt --to=iec $total_antes)"
printf "  peso gerado:     %s (só WebP, 3 larguras)\n" "$(numfmt --to=iec $total_depois)"
printf "  manifesto:       %s\n" "$MANIFESTO"
echo "==> Originais preservados em site/img/noticias/"
