import { topics, slots } from "../data/programme.js";
function TimeSlot({ slot, business = false }) {
  return (
    <div
      className={
        "programme__item" +
        (slot.guest ? " programme__guest" : "") +
        (business ? " programme__business-heading" : "")
      }
    >
      <div className="programme__focus-content">
        <span className="programme__time">{slot.time}</span>
        <h3 id={business ? "business-title" : undefined}>{slot.title}</h3>
      </div>
    </div>
  );
}
export function Programme() {
  return (
    <section
      className="programme"
      id="programme"
      aria-labelledby="programme-title"
    >
      <div className="programme__inner">
        <h2 id="programme-title">Программа</h2>
        <div className="programme__track">
          <TimeSlot slot={slots[0]} />
          <section
            className="programme__business"
            aria-labelledby="business-title"
          >
            <TimeSlot slot={slots[1]} business />
            <ol className="programme__topics">
              {topics.map((topic) => (
                <li
                  className="programme__item programme__topic"
                  key={topic.image}
                >
                  <div className="programme__focus-content">
                    {topic.icon ? (
                      <div className="programme__portrait programme__portrait--icon" aria-hidden="true">
                        <img src={topic.image} width="44" height="44" alt="" />
                      </div>
                    ) : (
                    <img
                      className="programme__portrait"
                      src={topic.image}
                      alt=""
                      width="92"
                      height="92"
                      loading="lazy"
                      decoding="async"
                    />
                    )}
                    <div className="programme__topic-copy">
                      <div className="programme__topic-heading">
                        {topic.author && (
                          <span className="programme__author">{topic.author}</span>
                        )}
                        <h3>{topic.title}</h3>
                      </div>
                      <p>{topic.description}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <div className="programme__evening">
            {slots.slice(2).map((slot) => (
              <TimeSlot key={slot.time} slot={slot} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
